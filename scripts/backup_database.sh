#!/bin/bash
# Database Backup Script for ORCA
# Runs every 6 hours via cron or Kubernetes CronJob

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/orca_backup_$TIMESTAMP.sql"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "🗄️  Starting ORCA database backup at $(date)"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "📦 Creating backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE.gz"

# Verify backup
if [ -f "$BACKUP_FILE.gz" ]; then
  SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
  echo "✅ Backup created successfully: $SIZE"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo "☁️  Uploading to S3: $S3_BUCKET"
  aws s3 cp "$BACKUP_FILE.gz" "s3://$S3_BUCKET/backups/"
  echo "✅ Uploaded to S3"
fi

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "orca_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup complete at $(date)"

# Send success notification (optional)
if [ -n "$WEBHOOK_URL" ]; then
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"✅ ORCA backup completed: $BACKUP_FILE\"}"
fi
