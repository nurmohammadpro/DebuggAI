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
import { spawn, execSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';

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

const PROJECTS_DIR =
  process.env.PROJECTS_DIR || path.join(process.cwd(), '.projects');
const STATE_FILE = path.join(PROJECTS_DIR, 'sandbox-state.json');
const BASE_PORT = parseInt(process.env.SANDBOX_BASE_PORT || '4000', 10);
const MAX_SANDBOXES = parseInt(process.env.MAX_SANDBOXES || '10', 10);
const DOCKER_IMAGE =
  process.env.SANDBOX_DOCKER_IMAGE || 'node:20-slim';
const SANDBOX_TIMEOUT_MS = parseInt(
  process.env.SANDBOX_TIMEOUT_MS || '1800000',
  10,
);

class SandboxManager {
  private sandboxes: Map<string, SandboxRecord> = new Map();
  private initPromise: Promise<void> | null = null;
  private monitors: Map<string, NodeJS.Timeout> = new Map();

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    await this.loadState();
    await this.cleanupStale();
  }

  async create(
    userId: string,
    files: Record<string, string>,
  ): Promise<SandboxRecord> {
    await this.init();

    // Enforce per-user limit
    const userCount = Array.from(this.sandboxes.values()).filter(
      (s) => s.userId === userId && s.status !== 'stopped',
    ).length;
    if (userCount >= MAX_SANDBOXES) {
      throw new Error(
        `Maximum ${MAX_SANDBOXES} concurrent sandboxes reached. Stop an existing one first.`,
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

  private generateStartScript(): string {
    return `#!/bin/sh
set -e

cd /app
echo "---SANDBOX_INSTALL_START---"
npm install 2>&1
echo "---SANDBOX_INSTALL_DONE---"

# Auto-detect framework and start dev server
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
  echo "---SANDBOX_DETECTED:next---"
  npx next dev -p 3000 -H 0.0.0.0
elif [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
  echo "---SANDBOX_DETECTED:vite---"
  npx vite --port 3000 --host 0.0.0.0
elif [ -f "angular.json" ]; then
  echo "---SANDBOX_DETECTED:angular---"
  npx ng serve --port 3000 --host 0.0.0.0
elif [ -f "package.json" ]; then
  # Try common dev scripts
  echo "---SANDBOX_DETECTED:package-scripts---"
  npx react-scripts start 2>/dev/null || npm run dev -- --port 3000 --host 0.0.0.0 2>/dev/null || npm start -- --port 3000 --host 0.0.0.0 2>/dev/null
else
  echo "---SANDBOX_DETECTED:static---"
  npx serve . -p 3000 -l 3000
fi
`;
  }

  private async startContainer(record: SandboxRecord): Promise<void> {
    const { projectDir, containerName, port } = record;

    // Remove any existing container with same name
    execSync(`docker rm -f ${containerName} 2>/dev/null || true`, {
      stdio: 'ignore',
    });

    record.status = 'installing';
    await this.saveState();

    // Run Docker container with startup script as main command (no docker exec).
    // This way docker logs -f captures npm install + dev server output.
    execSync(
      [
        'docker', 'run', '-d',
        '--name', containerName,
        '-p', `${port}:3000`,
        '-v', `${projectDir}:/app`,
        '-w', '/app',
        '--restart', 'no',
        DOCKER_IMAGE,
        'sh', '/app/.start.sh',
      ].join(' '),
      { stdio: 'ignore' },
    );

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

          if (record.status !== 'running') {
            record.status = 'error';
            record.error = `Process exited with code ${exitCode}`;
          }
          record.lastActiveAt = Date.now();
          this.saveState();
        } else if (record.status === 'installing') {
          // Health check: try to reach the dev server
          try {
            const httpCode = execSync(
              `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:${port} 2>/dev/null || echo ""`,
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
