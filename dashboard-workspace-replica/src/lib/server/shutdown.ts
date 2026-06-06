import 'server-only';

let isShuttingDown = false;
const shutdownHandlers: Array<{ name: string; fn: () => Promise<void> }> = [];

export function onShutdown(name: string, fn: () => Promise<void>): void {
  shutdownHandlers.push({ name, fn });
}

export function isGracefullyShuttingDown(): boolean {
  return isShuttingDown;
}

function setupShutdownHandlers(): void {
  if (typeof process === 'undefined') return;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[shutdown] Received ${signal}, starting graceful shutdown...`);

    const timeout = setTimeout(() => {
      console.error('[shutdown] Timed out waiting for handlers, forcing exit');
      process.exit(1);
    }, 25_000);
    timeout.unref();

    for (const handler of shutdownHandlers) {
      try {
        console.log(`[shutdown] Running handler: ${handler.name}`);
        await Promise.race([
          handler.fn(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 10_000)
          ),
        ]);
      } catch (err) {
        console.error(`[shutdown] Handler "${handler.name}" failed:`, err);
      }
    }

    clearTimeout(timeout);
    console.log('[shutdown] All handlers complete, exiting');
    process.exit(0);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Register handlers immediately on import
setupShutdownHandlers();
