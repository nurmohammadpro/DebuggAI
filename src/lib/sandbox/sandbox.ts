/**
 * Sandbox Manager
 *
 * Manages Docker-based sandboxes for building and previewing generated apps.
 * Each sandbox = a project directory + a Docker container running the dev server.
 *
 * State is persisted to a JSON file so it survives server restarts.
 * On init, stale containers from previous runs are cleaned up.
 */

import { promises as fs, readFileSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { normalizePreviewFiles } from '@/lib/project/package-normalizer';

export type SandboxStatus =
  | 'creating'
  | 'installing'
  | 'running'
  | 'error'
  | 'stopped';

export interface SandboxRecord {
  id: string;
  userId: string;
  projectId?: string;
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
// Sandbox containers run on an isolated Docker network with egress restricted
// to the allowlist below. Set SANDBOX_NETWORK='bridge' to bypass isolation,
// or 'none' for no network. The default 'debuggai-sandbox' network is created
// automatically on startup with iptables-based egress filtering.
const SANDBOX_NETWORK = process.env.SANDBOX_NETWORK || 'debuggai-sandbox';
const SANDBOX_DNS_SERVERS = process.env.SANDBOX_DNS_SERVERS || '8.8.8.8';
const SANDBOX_ISOLATED_NETWORK = 'debuggai-sandbox';
const SANDBOX_EGRESS_ALLOWLIST = (process.env.SANDBOX_EGRESS_ALLOWLIST || 'registry.npmjs.org,cdn.jsdelivr.net,unpkg.com').split(',').map(d => d.trim()).filter(Boolean);

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
    const route = readFileSync('/proc/net/route', 'utf8');
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

async function chmodRecursive(dir: string, mode: number) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await chmodRecursive(full, mode);
    } else if (entry.isFile()) {
      await fs.chmod(full, mode).catch(() => {});
    }
  }));
  await fs.chmod(dir, mode).catch(() => {});
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

    // Ensure the isolated Docker network exists (skip in DinD if iptables unavailable)
    try {
      const existing = execSync(
        `docker network ls --filter name=^${SANDBOX_ISOLATED_NETWORK}$ --format '{{.Name}}' 2>/dev/null || true`,
      ).toString().trim();
      if (!existing) {
        execSync(
          `docker network create --driver bridge ${SANDBOX_ISOLATED_NETWORK}`,
          { stdio: 'ignore', timeout: 10_000 },
        );
      }
    } catch {
      // Docker-in-Docker or no docker available — network isolation is best-effort
    }

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
    projectId?: string,
  ): Promise<SandboxRecord> {
    await this.init();
    this.assertDockerAvailable();
    const previewFiles = normalizePreviewFiles(files);
    this.validateFiles(previewFiles);

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
    for (const [filePath, content] of Object.entries(previewFiles)) {
      // Security: prevent directory traversal
      const sanitized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(projectDir, sanitized);
      if (!fullPath.startsWith(projectDir)) continue;
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, stripGeneratedFilenameHeader(content, sanitized), 'utf-8');
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
    // Make the project dir and all files world-writable so npm install,
    // tsc, and dev servers (Next.js/Turbopack) can write tsconfig.json,
    // lock files, and node_modules without EACCES.
    await chmodRecursive(projectDir, 0o777);

    const record: SandboxRecord = {
      id,
      userId,
      projectId: projectId ?? undefined,
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

# TypeScript build check — catches type errors, missing imports, broken interfaces
echo "---SANDBOX_BUILD_CHECK_START---"
if [ -f "tsconfig.json" ]; then
  if npx tsc --noEmit 2>&1; then
    echo "---SANDBOX_BUILD_CHECK_PASSED---"
  else
    echo "---SANDBOX_BUILD_FAILED:1---"
  fi
else
  echo "---SANDBOX_BUILD_CHECK_PASSED---"
fi

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

# Check for Next.js — either via config file or App Router directory structure.
# The config file can be missing after AI refactors that only emit changed files;
# detecting the app/ directory is a reliable fallback.
is_nextjs() {
  [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ] && return 0
  [ -f "app/layout.tsx" ] && return 0
  [ -f "app/layout.ts" ] && return 0
  [ -f "app/layout.jsx" ] && return 0
  [ -f "app/layout.js" ] && return 0
  [ -f "app/page.tsx" ] && return 0
  [ -f "app/page.ts" ] && return 0
  [ -f "app/page.jsx" ] && return 0
  [ -f "app/page.js" ] && return 0
  [ -f "src/app/layout.tsx" ] && return 0
  [ -f "src/app/layout.ts" ] && return 0
  [ -f "src/app/page.tsx" ] && return 0
  [ -f "src/app/page.ts" ] && return 0
  # Also check the next package is installed (proves it's a Next.js project)
  [ -d "node_modules/next" ] && return 0
  return 1
}

# Auto-detect framework and start dev server
if is_nextjs; then
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
  if is_nextjs; then
    run_and_watch 'next(client)' sh -lc 'npx next dev -p 3000 -H 0.0.0.0'
  elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
    run_and_watch 'vite(client)' sh -lc 'npx vite --port 3000 --host 0.0.0.0'
  else
    run_and_watch 'package-scripts(client)' sh -lc 'HOST=0.0.0.0 PORT=3000 npm start 2>/dev/null || npm run dev -- --port 3000 --host 0.0.0.0 2>/dev/null'
  fi
elif [ -f "package.json" ]; then
  # Try common dev scripts, but avoid react-scripts for non-CRA projects.
  if [ -f "public/index.html" ]; then
    run_and_watch cra sh -lc 'HOST=0.0.0.0 PORT=3000 npx react-scripts start'
  else
    run_and_watch package-scripts sh -lc 'npm run dev -- --port 3000 --host 0.0.0.0 2>/dev/null || npm start -- --port 3000 --host 0.0.0.0 2>/dev/null'
  fi
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
      '-e', 'HOME=/tmp',
      '-e', 'XDG_CONFIG_HOME=/tmp',
      '-e', 'NEXT_TELEMETRY_DISABLED=1',
      '-w', '/app',
      '--restart', 'no',
    ];

    // Egress firewall: if using the isolated network, enforce allowlist via iptables
    if (SANDBOX_NETWORK === SANDBOX_ISOLATED_NETWORK) {
      runArgs.push('--label', `debuggai.egress=${SANDBOX_EGRESS_ALLOWLIST.join(',')}`);
    }

    runArgs.push(DOCKER_IMAGE, 'sh', '/app/.start.sh');

    execSync(runArgs.join(' '), { stdio: 'ignore' });

    // Apply egress firewall after container starts (needs container IP)
    if (SANDBOX_NETWORK === SANDBOX_ISOLATED_NETWORK) {
      this.setupEgressFirewall(containerName).catch(() => {});
    }

    record.containerId = containerName;

    // Monitor container — detect dev server readiness, crashes, and stalled processes.
    // Fast polling during install (3s), slow polling once running (30s).
    let monitorPhase: 'installing' | 'running' = 'installing';
    const monitor = setInterval(() => {
      try {
        const running = execSync(
          `docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null || echo false`,
        ).toString().trim() === 'true';

        if (!running) {
          clearInterval(monitor);
          this.monitors.delete(record.id);
          if (record.status === 'stopped') return;

          const exitCode = execSync(
            `docker inspect -f '{{.State.ExitCode}}' ${containerName} 2>/dev/null || echo -1`,
          ).toString().trim();
          const logs = this.readRecentLogs(containerName);

          record.status = 'error';
          record.error = logs
            ? `Process exited with code ${exitCode}\n\nRecent logs:\n${logs}`
            : `Process exited with code ${exitCode}`;
          record.lastActiveAt = Date.now();
          this.saveState();
          return;
        }

        // Health check: probe the dev server
        let httpCode = '';
        try {
          httpCode = execSync(
            `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://${this.dockerHostIp}:${port} 2>/dev/null || echo "000"`,
            { timeout: 3000 },
          ).toString().trim();
        } catch {}

        if (monitorPhase === 'installing') {
          if (httpCode && httpCode !== '000') {
            record.status = 'running';
            monitorPhase = 'running';
            record.lastActiveAt = Date.now();
            this.saveState();
            // Switch to slower interval for ongoing health monitoring
            // (the interval itself stays at 30s from here; we update next tick)
          }
        } else if (monitorPhase === 'running') {
          // Dev server crashed while container is still up
          if (!httpCode || httpCode === '000') {
            record.status = 'error';
            const logs = this.readRecentLogs(containerName);
            record.error = logs
              ? `Dev server on port ${port} stopped responding.\n\nRecent logs:\n${logs}`
              : `Dev server on port ${port} stopped responding.`;
            record.lastActiveAt = Date.now();
            this.saveState();
            clearInterval(monitor);
            this.monitors.delete(record.id);
          }
        }
      } catch {
        clearInterval(monitor);
        this.monitors.delete(record.id);
      }
    }, monitorPhase === 'installing' ? 3000 : 30000);
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

  async findByProjectId(projectId: string, autoResume = true): Promise<SandboxRecord | null> {
    await this.init();
    for (const [, sandbox] of this.sandboxes) {
      if (sandbox.projectId === projectId && sandbox.status === 'running') {
        return sandbox;
      }
    }
    // Auto-resume a stopped sandbox for this project
    if (autoResume) {
      for (const [, sandbox] of this.sandboxes) {
        if (sandbox.projectId === projectId && sandbox.status === 'stopped') {
          return await this.resumeSandbox(sandbox);
        }
      }
    }
    return null;
  }

  private async resumeSandbox(sandbox: SandboxRecord): Promise<SandboxRecord | null> {
    try {
      this.assertDockerAvailable();
      sandbox.lastActiveAt = Date.now();
      sandbox.status = 'creating';
      sandbox.error = undefined;
      await this.saveState();
      await this.startContainer(sandbox);
      return sandbox;
    } catch (err) {
      sandbox.status = 'error';
      sandbox.error = `Auto-resume failed: ${err instanceof Error ? err.message : String(err)}`;
      await this.saveState();
      return null;
    }
  }

  async healthCheck(id: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return false;
    try {
      const httpCode = execSync(
        `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://${this.dockerHostIp}:${sandbox.port} 2>/dev/null || echo "000"`,
        { timeout: 3000 },
      ).toString().trim();
      return httpCode !== '000';
    } catch {
      return false;
    }
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

    // Clean up egress firewall rules before removing the container
    if (SANDBOX_NETWORK === SANDBOX_ISOLATED_NETWORK) {
      this.teardownEgressFirewall(sandbox.containerName);
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

  /**
   * Apply iptables rules to restrict container egress to the allowlist.
   *
   * For each allowed domain we add a DNAT rule that redirects outbound TCP 80/443
   * through the Docker host. All other outbound TCP is dropped via FORWARD chain.
   *
   * In DinD (Docker-in-Docker) scenarios where the host iptables are unreachable
   * (detected by checking if /proc/net/route indicates we're inside a container),
   * this is a no-op — egress control must be handled by the outer host.
   */
  private isDinD(): boolean {
    try {
      const route = readFileSync('/proc/net/route', 'utf8');
      return route.includes('00000000');
    } catch {
      return false;
    }
  }

  private setupEgressFirewall(containerName: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (this.isDinD()) return resolve();
        const containerIp = execSync(
          `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${containerName} 2>/dev/null || echo ''`,
        ).toString().trim();
        if (!containerIp) return resolve();

        // Allow loopback and established/related
        execSync(`iptables -I FORWARD -s ${containerIp} -d 127.0.0.0/8 -j ACCEPT 2>/dev/null || true`);
        execSync(`iptables -I FORWARD -s ${containerIp} -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true`);

        // Allow DNS
        execSync(`iptables -I FORWARD -s ${containerIp} -p udp --dport 53 -j ACCEPT 2>/dev/null || true`);
        execSync(`iptables -I FORWARD -s ${containerIp} -p tcp --dport 53 -j ACCEPT 2>/dev/null || true`);

        // Allow each egress domain (best-effort: iptables string match on host header)
        for (const domain of SANDBOX_EGRESS_ALLOWLIST) {
          execSync(
            `iptables -I FORWARD -s ${containerIp} -p tcp --dport 443 -m string --algo bm --string "${domain}" -j ACCEPT 2>/dev/null || true`,
          );
          execSync(
            `iptables -I FORWARD -s ${containerIp} -p tcp --dport 80 -m string --algo bm --string "${domain}" -j ACCEPT 2>/dev/null || true`,
          );
        }

        // Default: drop all other outbound TCP from this container
        execSync(`iptables -A FORWARD -s ${containerIp} -p tcp -j DROP 2>/dev/null || true`);

        resolve();
      } catch {
        // iptables unavailable — running in a restricted environment, skip
        resolve();
      }
    });
  }

  private teardownEgressFirewall(containerName: string): void {
    try {
      if (this.isDinD()) return;
      const containerIp = execSync(
        `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${containerName} 2>/dev/null || echo ''`,
      ).toString().trim();
      if (!containerIp) return;

      // Flush all FORWARD rules for this container's source IP
      const rules = execSync(
        `iptables -L FORWARD -n --line-numbers 2>/dev/null || true`,
      ).toString().split('\n');

      const linesToDelete: number[] = [];
      for (const line of rules) {
        if (line.includes(containerIp)) {
          const num = parseInt(line.trim().split(/\s+/)[0], 10);
          if (!isNaN(num)) linesToDelete.push(num);
        }
      }
      // Delete in reverse order to keep line numbers stable
      for (const n of linesToDelete.reverse()) {
        execSync(`iptables -D FORWARD ${n} 2>/dev/null || true`);
      }
    } catch {
      // Best-effort cleanup
    }
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

function stripGeneratedFilenameHeader(content: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/^(\.\/)+/, '');
  const basename = normalized.split('/').pop() || normalized;
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = new RegExp(
    `^\\s*(?:(?:\\/\\/|#)\\s*(?:file:\\s*)?(?:${escapeRegex(normalized)}|${escapeRegex(basename)})|\\/\\*\\s*(?:file:\\s*)?(?:${escapeRegex(normalized)}|${escapeRegex(basename)})\\s*\\*\\/)\\s*\\r?\\n`,
    'i',
  );
  return content.replace(marker, '');
}

export const sandboxManager = new SandboxManager();
