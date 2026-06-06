import 'server-only';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function getConfiguredLevel(): LogLevel {
  const env = process.env.LOG_LEVEL;
  if (env && env in LEVEL_RANK) return env as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const configuredLevel = getConfiguredLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel];
}

function formatEntry(entry: LogEntry): string {
  // In production, emit JSON for log aggregation tools.
  // In development, emit a human-readable line.
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  const { level, message, timestamp, correlationId, ...rest } = entry;
  const keys = Object.keys(rest);
  const extra = keys.length > 0 ? ' ' + JSON.stringify(rest) : '';
  const corr = correlationId ? ` [${correlationId}]` : '';
  return `${timestamp} ${level.toUpperCase()}${corr} ${message}${extra}`;
}

function emit(entry: LogEntry): void {
  const line = formatEntry(entry);
  if (entry.level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  emit({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

export const logger = {
  debug(message: string, extra?: Record<string, unknown>) {
    log('debug', message, extra);
  },
  info(message: string, extra?: Record<string, unknown>) {
    log('info', message, extra);
  },
  warn(message: string, extra?: Record<string, unknown>) {
    log('warn', message, extra);
  },
  error(message: string, extra?: Record<string, unknown>) {
    log('error', message, extra);
  },
};
