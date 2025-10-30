#!/bin/bash

###############################################################################
# Database Backup Script
# Creates encrypted backups with retention and verification
###############################################################################

set -euo pipefail

# Configuration (override with env vars)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/orca}"
S3_BUCKET="${S3_BUCKET:-orca-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
BACKUP_PREFIX="${BACKUP_PREFIX:-orca}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Load database credentials from secrets bridge
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-orca}"
DB_USER="${DB_USER:-orca_admin}"
PGPASSWORD="${PGPASSWORD:-}" # Set via env or secrets bridge

# Encryption
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"
GPG_RECIPIENT="${GPG_RECIPIENT:-dba@orca-platform.example}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}_${ENVIRONMENT}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.gpg"

###############################################################################
# Functions
###############################################################################

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
    log "ERROR: $*"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."
    
    command -v pg_dump >/dev/null 2>&1 || error "pg_dump not found"
    command -v gzip >/dev/null 2>&1 || error "gzip not found"
    command -v aws >/dev/null 2>&1 || log "WARNING: aws CLI not found, S3 upload will be skipped"
    
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        command -v gpg >/dev/null 2>&1 || error "gpg not found but encryption enabled"
    fi
}

create_backup_dir() {
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        log "Creating backup directory: ${BACKUP_DIR}"
        mkdir -p "${BACKUP_DIR}"
    fi
}

perform_backup() {
    log "Starting database backup: ${DB_NAME}@${DB_HOST}"
    log "Backup file: ${BACKUP_FILE}"
    
    # Use pg_dump with options:
    # -Fc: Custom format (compressed, supports parallel restore)
    # -v: Verbose
    # -Z 0: No compression (we'll compress separately for better control)
    # --no-owner: Don't output ownership commands
    # --no-privileges: Don't output privilege commands
    
    export PGPASSWORD
    
    if pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -Fc \
        -v \
        -Z 0 \
        --no-owner \
        --no-privileges \
        -f "${BACKUP_FILE}" 2>&1 | tee -a "${LOG_FILE}"; then
        log "Database backup completed successfully"
    else
        error "Database backup failed"
    fi
    
    unset PGPASSWORD
}

compress_backup() {
    log "Compressing backup..."
    
    if gzip -9 "${BACKUP_FILE}"; then
        log "Compression completed: ${COMPRESSED_FILE}"
        
        # Verify compressed file exists
        if [[ ! -f "${COMPRESSED_FILE}" ]]; then
            error "Compressed file not found: ${COMPRESSED_FILE}"
        fi
        
        # Log file size
        local size=$(du -h "${COMPRESSED_FILE}" | cut -f1)
        log "Compressed backup size: ${size}"
    else
        error "Compression failed"
    fi
}

encrypt_backup() {
    if [[ "${ENCRYPTION_ENABLED}" != "true" ]]; then
        log "Encryption disabled, skipping"
        return 0
    fi
    
    log "Encrypting backup for recipient: ${GPG_RECIPIENT}"
    
    if gpg --output "${ENCRYPTED_FILE}" \
        --encrypt \
        --recipient "${GPG_RECIPIENT}" \
        "${COMPRESSED_FILE}"; then
        log "Encryption completed: ${ENCRYPTED_FILE}"
        
        # Remove unencrypted file
        rm -f "${COMPRESSED_FILE}"
        log "Removed unencrypted file for security"
        
        # Update final backup file path
        FINAL_BACKUP_FILE="${ENCRYPTED_FILE}"
    else
        error "Encryption failed"
    fi
}

upload_to_s3() {
    if ! command -v aws >/dev/null 2>&1; then
        log "AWS CLI not found, skipping S3 upload"
        return 0
    fi
    
    local final_file
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        final_file="${ENCRYPTED_FILE}"
    else
        final_file="${COMPRESSED_FILE}"
    fi
    
    local s3_key="${ENVIRONMENT}/$(basename "${final_file}")"
    
    log "Uploading to S3: s3://${S3_BUCKET}/${s3_key}"
    
    if aws s3 cp "${final_file}" "s3://${S3_BUCKET}/${s3_key}" \
        --storage-class STANDARD_IA \
        --metadata "environment=${ENVIRONMENT},timestamp=${TIMESTAMP}"; then
        log "S3 upload completed successfully"
    else
        error "S3 upload failed"
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days"
    
    # Local cleanup
    find "${BACKUP_DIR}" -name "${BACKUP_PREFIX}_${ENVIRONMENT}_*.sql.gz*" \
        -mtime "+${RETENTION_DAYS}" \
        -exec rm -v {} \; | tee -a "${LOG_FILE}"
    
    # S3 cleanup (if available)
    if command -v aws >/dev/null 2>&1; then
        log "S3 lifecycle policy should handle retention (configured for ${RETENTION_DAYS} days)"
    fi
}

record_backup_metadata() {
    local metadata_file="${BACKUP_DIR}/backup_metadata.json"
    local final_file
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        final_file="${ENCRYPTED_FILE}"
    else
        final_file="${COMPRESSED_FILE}"
    fi
    
    local size=$(stat -f%z "${final_file}" 2>/dev/null || stat -c%s "${final_file}")
    local checksum=$(sha256sum "${final_file}" | awk '{print $1}')
    
    # Append to metadata file (JSON lines format)
    cat >> "${metadata_file}" <<EOF
{"timestamp":"${TIMESTAMP}","environment":"${ENVIRONMENT}","file":"$(basename "${final_file}")","size":${size},"checksum":"${checksum}","encrypted":${ENCRYPTION_ENABLED},"db_host":"${DB_HOST}","db_name":"${DB_NAME}"}
EOF
    
    log "Backup metadata recorded"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # In production, send to monitoring/alerting system
    # For now, just log
    log "NOTIFICATION [${status}]: ${message}"
    
    # Example: Send to Slack
    # curl -X POST "${SLACK_WEBHOOK_URL}" -d "{\"text\":\"${message}\"}"
}

###############################################################################
# Main
###############################################################################

main() {
    log "=== Database Backup Started ==="
    log "Environment: ${ENVIRONMENT}"
    
    check_dependencies
    create_backup_dir
    
    # Perform backup steps
    perform_backup
    compress_backup
    
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        encrypt_backup
    fi
    
    upload_to_s3
    record_backup_metadata
    cleanup_old_backups
    
    log "=== Database Backup Completed Successfully ==="
    
    local final_file
    if [[ "${ENCRYPTION_ENABLED}" == "true" ]]; then
        final_file="${ENCRYPTED_FILE}"
    else
        final_file="${COMPRESSED_FILE}"
    fi
    
    send_notification "SUCCESS" "Database backup completed: ${final_file}"
}

# Trap errors
trap 'error "Backup script failed at line $LINENO"' ERR

# Run main function
main "$@"
