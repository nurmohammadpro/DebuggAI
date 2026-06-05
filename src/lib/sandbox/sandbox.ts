/**
 * Sandbox Manager
 *
 * Manages Docker-based sandboxes for building and previewing generated apps.
 * Each sandbox = a project directory + a Docker container running the dev server.
 *
 * State is persisted to a JSON file so it survives server restarts.
 * On init, stale containers from previous runs are cleaned up.
 */

import { promises as fs } from 'fs';
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export type SandboxStatus =
  | 'creating'
  | 'installing'
  | 'running'
  | 'error'
  | 'stopped';

export interface SandboxRecord {
  id: string;
  userId: string;
  projectDir: string;
  containerName: string;
  port: number;
  status: SandboxStatus;
  error?: string;
  createdAt: number;
  lastActiveAt: number;
  containerId?: string;
}

// Default to OS temp dir to avoid bundler/NFT tracing the whole repo via process.cwd().
// Override with PROJECTS_DIR in production for a persistent location.
const PROJECTS_DIR =
  process.env.PROJECTS_DIR || path.join(os.tmpdir(), 'debuggai-projects');
const STATE_FILE = path.join(PROJECTS_DIR, 'sandbox-state.json');
const BASE_PORT = parseInt(process.env.SANDBOX_BASE_PORT || '4000', 10);
const MAX_SANDBOXES = parseInt(process.env.MAX_SANDBOXES || '4', 10);
const MAX_SANDBOXES_PER_USER = parseInt(
  process.env.MAX_SANDBOXES_PER_USER || '1',
  10,
);
const SANDBOX_REPLACE_USER_ACTIVE =
  process.env.SANDBOX_REPLACE_USER_ACTIVE !== '0' &&
  process.env.SANDBOX_REPLACE_USER_ACTIVE !== 'false';
const DOCKER_IMAGE =
  process.env.SANDBOX_DOCKER_IMAGE || 'node:20-slim';
const SANDBOX_TIMEOUT_MS = parseInt(
  process.env.SANDBOX_TIMEOUT_MS || '900000',
  10,
);
const SANDBOX_REAPER_INTERVAL_MS = parseInt(
  process.env.SANDBOX_REAPER_INTERVAL_MS || '300000',
  10,
);
const SANDBOX_LIMIT_CPUS = process.env.SANDBOX_LIMIT_CPUS || '1.0';
const SANDBOX_LIMIT_MEMORY = process.env.SANDBOX_LIMIT_MEMORY || '1024m';
const SANDBOX_LIMIT_PIDS = process.env.SANDBOX_LIMIT_PIDS || '256';
const SANDBOX_MAX_FILES = parseInt(process.env.SANDBOX_MAX_FILES || '80', 10);
const SANDBOX_MAX_FILE_BYTES = parseInt(
  process.env.SANDBOX_MAX_FILE_BYTES || `${256 * 1024}`,
  10,
);
const SANDBOX_MAX_TOTAL_BYTES = parseInt(
  process.env.SANDBOX_MAX_TOTAL_BYTES || `${2 * 1024 * 1024}`,
  10,
);
const SANDBOX_NPM_CACHE_DIR =
  process.env.SANDBOX_NPM_CACHE_DIR || path.join(PROJECTS_DIR, '.npm-cache');
// The preview container must have egress during npm install. Use a custom Docker
// network plus host firewall/proxy if stronger isolation is required in prod.
const SANDBOX_NETWORK = process.env.SANDBOX_NETWORK || 'bridge'; // 'bridge', 'none', or custom network name
const SANDBOX_DNS_SERVERS = process.env.SANDBOX_DNS_SERVERS || '8.8.8.8';
// Egress allowlist: domains sandbox containers can reach (comma-separated)
const SANDBOX_EGRESS_ALLOWLIST = (process.env.SANDBOX_EGRESS_ALLOWLIST || 'registry.npmjs.org,cdn.jsdelivr.net,unpkg.com').split(',');

/**
 * Docker host IP address reachable from inside this container.
 *
 * When the app runs inside Docker (DinD setup), 127.0.0.1 is the container's own
 * loopback, not the host's. Published sandbox ports are only reachable through
 * the Docker bridge gateway IP. This function reads /proc/net/route to discover
 * the default gateway (= the Docker host) and caches the result.
 */
let _dockerHostIp: string | undefined;
function getDockerHostIp(): string {
  if (_dockerHostIp) return _dockerHostIp;
  try {
    const route = require('fs').readFileSync('/proc/net/route', 'utf8');
    for (const line of route.split('\n')) {
      const p = line.trim().split(/\s+/);
      if (p[0] && p[1] === '00000000' && p[2] && p[2] !== '00000000') {
        const h = p[2];
        _dockerHostIp = [
          parseInt(h.substring(6, 8), 16),
          parseInt(h.substring(4, 6), 16),
          parseInt(h.substring(2, 4), 16),
          parseInt(h.substring(0, 2), 16),
        ].join('.');
        return _dockerHostIp;
      }
    }
  } catch {
    // fall through to 127.0.0.1
  }
  _dockerHostIp = '127.0.0.1';
  return _dockerHostIp;
}

class SandboxManager {
  /** Exposed for preview proxy to reach sandbox containers from this container. */
  readonly dockerHostIp: string = getDockerHostIp();
  private sandboxes: Map<string, SandboxRecord> = new Map();
  private initPromise: Promise<void> | null = null;
  private monitors: Map<string, NodeJS.Timeout> = new Map();
  private reaper: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await fs.mkdir(SANDBOX_NPM_CACHE_DIR, { recursive: true });
    await fs.chmod(SANDBOX_NPM_CACHE_DIR, 0o777).catch(() => {});
    await this.loadState();
    await this.cleanupStale();

    if (!this.reaper) {
      this.reaper = setInterval(() => {
        void this.reapExpired().catch(() => {});
      }, SANDBOX_REAPER_INTERVAL_MS);
      this.reaper.unref?.();
    }
  }

  async create(
    userId: string,
    files: Record<string, string>,
  ): Promise<SandboxRecord> {
    await this.init();
    this.assertDockerAvailable();
    this.validateFiles(files);

    let activeSandboxes = Array.from(this.sandboxes.values()).filter(
      (s) => s.status !== 'stopped',
    );
    const userActiveSandboxes = activeSandboxes.filter((s) => s.userId === userId);
    if (SANDBOX_REPLACE_USER_ACTIVE) {
      for (const sandbox of userActiveSandboxes) {
        await this.stop(sandbox.id).catch(() => {});
      }
    } else if (userActiveSandboxes.length >= MAX_SANDBOXES_PER_USER) {
      throw new Error(
        `Only ${MAX_SANDBOXES_PER_USER} active preview is allowed per user. Stop the current preview first.`,
      );
    }

    activeSandboxes = Array.from(this.sandboxes.values()).filter(
      (s) => s.status !== 'stopped',
    );
    if (activeSandboxes.length >= MAX_SANDBOXES) {
      throw new Error(
        `Preview capacity is full (${MAX_SANDBOXES} active). Try again in a minute.`,
      );
    }

    const id = crypto.randomBytes(8).toString('hex');
    const projectDir = path.join(PROJECTS_DIR, id);
    const containerName = `debuggai-${id}`;
    const port = await this.allocatePort();

    // Write all project files to disk
    await fs.mkdir(projectDir, { recursive: true });
    for (const [filePath, content] of Object.entries(files)) {
      // Security: prevent directory traversal
      const sanitized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(projectDir, sanitized);
      if (!fullPath.startsWith(projectDir)) continue;
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    // Generate a docker-compatible startup script
    const startScript = this.generateStartScript();
    await fs.writeFile(
      path.join(projectDir, '.start.sh'),
      startScript,
      { mode: 0o755 },
    );

    // Sandbox containers run with --cap-drop ALL (no DAC_OVERRIDE),
    // so even root can't write to files owned by another UID.
    // Make the project dir world-writable so npm install / dev servers work.
    await fs.chmod(projectDir, 0o777);

    const record: SandboxRecord = {
      id,
      userId,
      projectDir,
      containerName,
      port,
      status: 'creating',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.sandboxes.set(id, record);
    await this.saveState();

    // Start the container asynchronously
    this.startContainer(record).catch((err) => {
      record.status = 'error';
      record.error = err.message || String(err);
      this.saveState();
    });

    return record;
  }

  /**
   * Resolve the real host path for a container path that lives on a Docker volume.
   *
   * When the app container bind-mounts its PROJECTS_DIR via Docker socket,
   * the daemon resolves paths from the host filesystem — not the container.
   * A named Docker volume lives at /var/lib/docker/volumes/<name>/_data on the
   * host, so we must translate the container-internal PROJECTS_DIR prefix to
   * the actual host Mountpoint.
   */
  private resolveHostPath(containerProjectDir: string): string {
    try {
      const myId = os.hostname();
      const stdout = execSync(
        `docker inspect --format '{{range .Mounts}}{{\"\\n\"}}{{.Destination}}{{\"|\"}}{{.Source}}{{end}}' "${myId}"`,
        { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
      ).toString();

      for (const line of stdout.trim().split('\n')) {
        const [dest, source] = line.split('|');
        if (dest && source && dest === PROJECTS_DIR) {
          return containerProjectDir.replace(PROJECTS_DIR, source);
        }
      }
    } catch {
      // fall through to direct mount if self-inspect fails
    }

    // Fallback: use a direct bind mount on the host if available
    try {
      const s = execSync(
        `test -d "${PROJECTS_DIR}" 2>/dev/null && echo YES || echo NO`,
        { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] },
      ).toString().trim();
      if (s === 'YES') {
        return containerProjectDir; // host has the path, use it directly
      }
    } catch {
      // fall through
    }

    return containerProjectDir;
  }

  private assertDockerAvailable() {
    try {
      const result = spawnSync('docker', ['version'], { stdio: 'ignore' });
      if (result.error) throw result.error;
      if (typeof result.status === 'number' && result.status !== 0) {
        throw new Error('docker exited non-zero');
      }
    } catch {
      throw new Error(
        'Docker is required to run sandboxes. Install Docker Desktop and ensure the `docker` CLI is available, then restart the dev server.',
      );
    }
  }

  private validateFiles(files: Record<string, string>) {
    const entries = Object.entries(files);
    if (entries.length > SANDBOX_MAX_FILES) {
      throw new Error(
        `Preview is limited to ${SANDBOX_MAX_FILES} files. Export or deploy larger projects instead.`,
      );
    }

    let totalBytes = 0;
    for (const [filePath, content] of entries) {
      if (typeof content !== 'string') {
        throw new Error(`Invalid file content for ${filePath}`);
      }

      const bytes = Buffer.byteLength(content, 'utf-8');
      if (bytes > SANDBOX_MAX_FILE_BYTES) {
        throw new Error(
          `${filePath} is too large for live preview (${Math.ceil(bytes / 1024)} KB).`,
        );
      }

      totalBytes += bytes;
    }

    if (totalBytes > SANDBOX_MAX_TOTAL_BYTES) {
      throw new Error(
        `Preview is limited to ${Math.ceil(SANDBOX_MAX_TOTAL_BYTES / 1024 / 1024)} MB of source files.`,
      );
    }
  }

  private generateStartScript(): string {
    return `#!/bin/sh
set -e

cd /app
echo "---SANDBOX_INSTALL_START---"

# Install dependencies.
# Supports:
# 1) root package.json (single app or workspaces)
# 2) common split repos: client/ + server/
if [ -f "package.json" ]; then
  npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund 2>&1
elif [ -f "client/package.json" ]; then
  (cd client && npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund 2>&1)
  if [ -f "server/package.json" ]; then
    (cd server && npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund 2>&1)
  fi
else
  echo "No package.json found. Nothing to install."
fi

echo "---SANDBOX_INSTALL_DONE---"

probe_port() {
  node -e "fetch('http://127.0.0.1:3000').then(() => process.exit(0)).catch(() => process.exit(1))" >/dev/null 2>&1
}

run_and_watch() {
  NAME="$1"
  shift
  echo "---SANDBOX_DETECTED:$NAME---"
  "$@" &
  SERVER_PID=$!

  ATTEMPTS=0
  while [ "$ATTEMPTS" -lt 120 ]; do
    if probe_port; then
      echo "---SANDBOX_READY---"
      break
    fi

    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      wait "$SERVER_PID"
      EXIT_CODE=$?
      echo "---SANDBOX_EXIT:$EXIT_CODE---"
      if [ "$EXIT_CODE" -ne 0 ]; then
        exit "$EXIT_CODE"
      fi
    fi

    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 1
  done

  if ! probe_port; then
    echo "---SANDBOX_READY_TIMEOUT---"
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill "$SERVER_PID" 2>/dev/null || true
      wait "$SERVER_PID" 2>/dev/null || true
    fi
    exit 1
  fi

  while probe_port; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      wait "$SERVER_PID"
      EXIT_CODE=$?
      echo "---SANDBOX_EXIT:$EXIT_CODE---"
      if [ "$EXIT_CODE" -eq 0 ]; then
        # Some package scripts daemonize the actual server. Keep the container
        # alive as long as the port is still serving requests.
        sleep 5
        continue
      fi
      exit "$EXIT_CODE"
    fi
    sleep 5
  done

  if kill -0 "$SERVER_PID" 2>/dev/null; then
    wait "$SERVER_PID"
    EXIT_CODE=$?
    echo "---SANDBOX_EXIT:$EXIT_CODE---"
    exit "$EXIT_CODE"
  fi
}

# Auto-detect framework and start dev server
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
  run_and_watch next sh -lc 'npx next dev -p 3000 -H 0.0.0.0'
elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
  run_and_watch vite sh -lc 'npx vite --port 3000 --host 0.0.0.0'
elif [ -f "angular.json" ]; then
  run_and_watch angular sh -lc 'npx ng serve --port 3000 --host 0.0.0.0'
elif [ -f "client/package.json" ]; then
  echo "---SANDBOX_DETECTED:client-server---"
  # Best-effort: start server in the background (not exposed), run client on port 3000.
  if [ -f "server/package.json" ]; then
    (cd server && (npm run dev 2>/dev/null || npm start 2>/dev/null || true)) &
  fi

  cd client
  if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
    run_and_watch 'next(client)' sh -lc 'npx next dev -p 3000 -H 0.0.0.0'
  elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
    run_and_watch 'vite(client)' sh -lc 'npx vite --port 3000 --host 0.0.0.0'
  else
    run_and_watch 'package-scripts(client)' sh -lc 'HOST=0.0.0.0 PORT=3000 npm start 2>/dev/null || npm run dev -- --port 3000 --host 0.0.0.0 2>/dev/null'
  fi
elif [ -f "package.json" ]; then
  # Try common dev scripts
  run_and_watch package-scripts sh -lc 'HOST=0.0.0.0 PORT=3000 npx react-scripts start 2>/dev/null || npm run dev -- --port 3000 --host 0.0.0.0 2>/dev/null || npm start -- --port 3000 --host 0.0.0.0 2>/dev/null'
else
  run_and_watch static sh -lc 'npx serve . -p 3000 -l 3000'
fi
`;
  }

  private async startContainer(record: SandboxRecord): Promise<void> {
    const { projectDir, containerName, port } = record;
    this.assertDockerAvailable();

    // Remove any existing container with same name
    execSync(`docker rm -f ${containerName} 2>/dev/null || true`, {
      stdio: 'ignore',
    });

    record.status = 'installing';
    await this.saveState();

    // Resolve the host-side path for the volume bind mount.
    // Docker interprets bind mount source paths from the host filesystem,
    // not the container's — so we must translate via docker inspect.
    const hostProjectDir = this.resolveHostPath(projectDir);
    const hostNpmCacheDir = this.resolveHostPath(SANDBOX_NPM_CACHE_DIR);

    // Run Docker container with startup script as main command (no docker exec).
    // This way docker logs -f captures npm install + dev server output.
    // Build Docker run args with network isolation
    const runArgs = [
      'docker', 'run', '-d',
      '--name', containerName,
      '--cpus', SANDBOX_LIMIT_CPUS,
      '--memory', SANDBOX_LIMIT_MEMORY,
      '--pids-limit', SANDBOX_LIMIT_PIDS,
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--tmpfs', '/tmp:rw,nosuid,nodev,size=64m',
      '--network', SANDBOX_NETWORK,
      '--dns', SANDBOX_DNS_SERVERS,
      '-p', `${port}:3000`,
      '-v', `${hostProjectDir}:/app`,
      '-v', `${hostNpmCacheDir}:/npm-cache`,
      '-e', 'npm_config_cache=/npm-cache',
      '-e', 'NEXT_TELEMETRY_DISABLED=1',
      '-w', '/app',
      '--restart', 'no',
    ];

    // Egress filtering: if using bridge network, add custom iptables rules
    // via container labels for external enforcement
    if (SANDBOX_NETWORK === 'bridge') {
      runArgs.push('--label', `debuggai.egress=${SANDBOX_EGRESS_ALLOWLIST.join(',')}`);
    }

    runArgs.push(DOCKER_IMAGE, 'sh', '/app/.start.sh');

    execSync(runArgs.join(' '), { stdio: 'ignore' });

    record.containerId = containerName;

    // Monitor container — detect running dev server or catch crashes
    const monitor = setInterval(() => {
      try {
        const running = execSync(
          `docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null || echo false`,
        ).toString().trim() === 'true';

        if (!running) {
          clearInterval(monitor);
          this.monitors.delete(record.id);
          // Skip if already stopped intentionally
          if (record.status === 'stopped') return;

          const exitCode = execSync(
            `docker inspect -f '{{.State.ExitCode}}' ${containerName} 2>/dev/null || echo -1`,
          ).toString().trim();
          const recentLogs = this.readRecentLogs(containerName);

          if (record.status !== 'running') {
            record.status = 'error';
            record.error = recentLogs
              ? `Process exited with code ${exitCode}\n\nRecent logs:\n${recentLogs}`
              : `Process exited with code ${exitCode}`;
          }
          record.lastActiveAt = Date.now();
          this.saveState();
        } else if (record.status === 'installing') {
          // Health check: try to reach the dev server
          try {
            const httpCode = execSync(
              `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://${this.dockerHostIp}:${port} 2>/dev/null || echo ""`,
              { timeout: 3000 },
            ).toString().trim();
            if (httpCode && httpCode !== '000') {
              record.status = 'running';
              clearInterval(monitor);
              this.monitors.delete(record.id);
              record.lastActiveAt = Date.now();
              this.saveState();
            }
          } catch {}
        }
      } catch {
        clearInterval(monitor);
        this.monitors.delete(record.id);
      }
    }, 3000);
    this.monitors.set(record.id, monitor);
  }

  private readRecentLogs(containerName: string): string {
    try {
      return execSync(
        `docker logs ${containerName} --tail 80 2>&1 || true`,
        { stdio: 'pipe' },
      )
        .toString()
        .trim();
    } catch {
      return '';
    }
  }

  async get(id: string): Promise<SandboxRecord | null> {
    await this.init();
    return this.sandboxes.get(id) ?? null;
  }

  async getLogs(id: string): Promise<{ lines: string[]; isRunning: boolean }> {
    await this.init();
    const sandbox = this.sandboxes.get(id);
    if (!sandbox?.containerName) return { lines: [], isRunning: false };
    try {
      const { execSync } = await import('child_process');
      const stdout = execSync(
        `docker logs ${sandbox.containerName} --tail 500 2>&1 || true`,
      ).toString();
      const isRunning =
        execSync(
          `docker inspect -f '{{.State.Running}}' ${sandbox.containerName} 2>/dev/null || echo false`,
        )
          .toString()
          .trim() === 'true';
      return { lines: stdout.split('\n').filter(Boolean), isRunning };
    } catch {
      return { lines: [], isRunning: false };
    }
  }

  async stop(id: string): Promise<void> {
    await this.init();
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error('Sandbox not found');

    // Stop monitoring before stopping container
    const mon = this.monitors.get(id);
    if (mon) {
      clearInterval(mon);
      this.monitors.delete(id);
    }

    execSync(
      `docker stop ${sandbox.containerName} 2>/dev/null || true`,
      { stdio: 'ignore' },
    );
    execSync(
      `docker rm ${sandbox.containerName} 2>/dev/null || true`,
      { stdio: 'ignore' },
    );

    sandbox.status = 'stopped';
    sandbox.lastActiveAt = Date.now();
    await this.saveState();
  }

  async exportZip(id: string): Promise<string> {
    await this.init();
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error('Sandbox not found');

    const zipPath = path.join(PROJECTS_DIR, `${id}.zip`);
    execSync(
      `cd "${PROJECTS_DIR}" && zip -r "${zipPath}" "${id}" -x "*/node_modules/*" "*/node_modules/**" "*/.next/*" "*/.next/**"`,
      { stdio: 'ignore' },
    );
    return zipPath;
  }

  async touch(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id);
    if (sandbox) {
      sandbox.lastActiveAt = Date.now();
      await this.saveState();
    }
  }

  async updateStatus(id: string, status: SandboxStatus): Promise<void> {
    const sandbox = this.sandboxes.get(id);
    if (sandbox) {
      sandbox.status = status;
      sandbox.lastActiveAt = Date.now();
      await this.saveState();
    }
  }

  private async allocatePort(): Promise<number> {
    const usedPorts = new Set(
      Array.from(this.sandboxes.values())
        .filter((s) => s.status !== 'stopped')
        .map((s) => s.port),
    );
    let port = BASE_PORT;
    while (usedPorts.has(port)) port++;
    return port;
  }

  private async cleanupStale(): Promise<void> {
    for (const sandbox of this.sandboxes.values()) {
      if (sandbox.status !== 'stopped') {
        execSync(
          `docker stop ${sandbox.containerName} 2>/dev/null || true`,
          { stdio: 'ignore' },
        );
        execSync(
          `docker rm ${sandbox.containerName} 2>/dev/null || true`,
          { stdio: 'ignore' },
        );
        sandbox.status = 'stopped';
      }
    }
    // Also clean up expired sandboxes
    const now = Date.now();
    for (const sandbox of this.sandboxes.values()) {
      if (
        sandbox.status === 'stopped' &&
        now - sandbox.lastActiveAt > SANDBOX_TIMEOUT_MS
      ) {
        // Remove project directory for old stopped sandboxes
        fs.rm(sandbox.projectDir, { recursive: true, force: true }).catch(() => {});
        this.sandboxes.delete(sandbox.id);
      }
    }
    await this.saveState();
  }

  private async reapExpired(): Promise<void> {
    const now = Date.now();

    // Stop sandboxes that have been idle too long (even if still marked running/installing).
    for (const sandbox of this.sandboxes.values()) {
      const age = now - sandbox.lastActiveAt;
      if (sandbox.status !== 'stopped' && age > SANDBOX_TIMEOUT_MS) {
        try {
          await this.stop(sandbox.id);
        } catch {
          // ignore
        }
      }
    }

    // Remove old stopped sandboxes from disk/state.
    for (const sandbox of this.sandboxes.values()) {
      const age = now - sandbox.lastActiveAt;
      if (sandbox.status === 'stopped' && age > SANDBOX_TIMEOUT_MS) {
        fs.rm(sandbox.projectDir, { recursive: true, force: true }).catch(() => {});
        this.sandboxes.delete(sandbox.id);
      }
    }

    await this.saveState();
  }

  private async saveState(): Promise<void> {
    const data = JSON.stringify(Array.from(this.sandboxes.entries()));
    await fs.writeFile(STATE_FILE, data, 'utf-8');
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf-8');
      const entries: [string, SandboxRecord][] = JSON.parse(data);
      this.sandboxes = new Map(entries);
    } catch {
      this.sandboxes = new Map();
    }
  }
}

export const sandboxManager = new SandboxManager();
