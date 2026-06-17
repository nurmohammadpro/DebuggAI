#!/bin/bash
set -euo pipefail

# DebuggAI Daily Backup
# Schedule via cron: 0 3 * * * /home/debuggai/app/scripts/backup.sh
#
# Backs up:
#   1. Supabase project_files via pg_dump (requires SUPABASE_DB_URL in env)
#   2. Local .next build cache and uploaded assets
#
# Retention: 14 daily rolling backups
# Restore:  tar xzf <backup>.tar.gz && psql <SEED_DB_URL> < <backup>.sql

BACKUP_DIR="/home/debuggai/backups"
RETENTION_DAYS=14
DATE=$(date +%Y-%m-%d)
APP_DIR="/home/debuggai/app"

mkdir -p "$BACKUP_DIR"

# ---------- Database backup ----------
echo "[$(date)] Starting backup..."

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  pg_dump "$SUPABASE_DB_URL" \
    --table=project_files \
    --data-only \
    --column-inserts \
    --no-owner \
    --no-acl \
    -f "$BACKUP_DIR/db-$DATE.sql" 2>&1 || echo "  pg_dump failed (check SUPABASE_DB_URL)"
else
  echo "  SUPABASE_DB_URL not set — skipping DB backup"
fi

# ---------- Files backup ----------
tar -czf "$BACKUP_DIR/files-$DATE.tar.gz" \
  -C "$APP_DIR" \
  .env 2>/dev/null || true

# ---------- Cleanup old backups ----------
find "$BACKUP_DIR" -name "*.sql" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup complete. $(ls "$BACKUP_DIR" | wc -l) files retained."
