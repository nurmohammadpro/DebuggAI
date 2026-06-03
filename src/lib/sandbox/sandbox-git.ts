/**
 * Sandbox Git Helper
 *
 * Auto-initializes a git repo in each sandbox, creates a branch per
 * conversation thread, and commits on each agent turn. This gives
 * users a full version history without manual intervention.
 */

import { execSync } from 'child_process';

/**
 * Initialize git in a project directory and create a branch.
 * Idempotent — safe to call multiple times.
 */
export function ensureGitRepo(
  projectDir: string,
  branchName: string,
): string {
  try {
    // Initialize if not already a git repo
    const isRepo = execSync(
      `cd "${projectDir}" && git rev-parse --git-dir 2>/dev/null && echo YES || echo NO`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();

    if (isRepo === 'NO') {
      execSync(`cd "${projectDir}" && git init && git checkout -b main`, {
        timeout: 5000, stdio: 'ignore',
      });

      // Create .gitignore
      execSync(
        `cat > "${projectDir}/.gitignore" << 'GITIGNORE'\nnode_modules/\n.next/\nout/\ndist/\n.env.local\n*.log\n.gitkeep\nGITIGNORE`,
        { timeout: 3000 },
      );
    }

    // Configure git user if not set
    execSync(
      `cd "${projectDir}" && git config user.email "agent@debuggai.dev" 2>/dev/null || true`,
      { timeout: 3000, stdio: 'ignore' },
    );
    execSync(
      `cd "${projectDir}" && git config user.name "DeBuggAI Agent" 2>/dev/null || true`,
      { timeout: 3000, stdio: 'ignore' },
    );

    // Create or switch to the branch
    const branches = execSync(
      `cd "${projectDir}" && git branch --list "${branchName}"`,
      { encoding: 'utf-8', timeout: 3000 },
    ).trim();

    if (!branches) {
      execSync(`cd "${projectDir}" && git checkout -b "${branchName}"`, {
        timeout: 5000, stdio: 'ignore',
      });
    } else {
      execSync(`cd "${projectDir}" && git checkout "${branchName}"`, {
        timeout: 5000, stdio: 'ignore',
      });
    }

    return branchName;
  } catch (err) {
    console.warn('[sandbox-git] Failed to initialize git:', err instanceof Error ? err.message : err);
    return branchName;
  }
}

/**
 * Commit all changes in the sandbox project directory.
 * Returns the commit hash or null if nothing to commit.
 */
export function gitCommitAll(
  projectDir: string,
  message: string,
): string | null {
  try {
    // Stage all changes
    execSync(`cd "${projectDir}" && git add -A`, {
      timeout: 10000, stdio: 'ignore',
    });

    // Check if there's anything to commit
    const status = execSync(
      `cd "${projectDir}" && git status --porcelain`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();

    if (!status) return null; // Nothing to commit

    // Sanitize commit message (remove newlines, limit length)
    const cleanMessage = message
      .replace(/[\n\r]/g, ' ')
      .replace(/['"`]/g, '')
      .slice(0, 200);

    const result = execSync(
      `cd "${projectDir}" && git commit -m "${cleanMessage}"`,
      { encoding: 'utf-8', timeout: 10000 },
    ).trim();

    // Extract commit hash
    const match = result.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
    return match?.[1] || null;
  } catch (err) {
    console.warn('[sandbox-git] Failed to commit:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get the git diff between two branches or commits.
 */
export function gitDiff(
  projectDir: string,
  from: string,
  to = 'HEAD',
): string | null {
  try {
    return execSync(
      `cd "${projectDir}" && git diff ${from}..${to} --stat`,
      { encoding: 'utf-8', timeout: 10000 },
    ).trim();
  } catch {
    return null;
  }
}

/**
 * Get the current branch name.
 */
export function getCurrentBranch(projectDir: string): string | null {
  try {
    return execSync(
      `cd "${projectDir}" && git rev-parse --abbrev-ref HEAD`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
  } catch {
    return null;
  }
}
