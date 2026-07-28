#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 BACKUP.sql.gz.enc TARGET_DATABASE_URL" >&2
  exit 2
fi
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD is required}"

encrypted="$1"
target="$2"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

openssl enc -d -aes-256-cbc -pbkdf2 -in "$encrypted" -out "$tmp/backup.sql.gz" -pass env:BACKUP_ENCRYPTION_PASSWORD
gunzip "$tmp/backup.sql.gz"
psql "$target" -v ON_ERROR_STOP=1 -f "$tmp/backup.sql"
echo "Restore completed. Validate application behaviour and RLS before declaring success."
