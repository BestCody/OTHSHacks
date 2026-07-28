#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_S3_ENDPOINT:?SUPABASE_S3_ENDPOINT is required}"
: "${SUPABASE_S3_ACCESS_KEY_ID:?SUPABASE_S3_ACCESS_KEY_ID is required}"
: "${SUPABASE_S3_SECRET_ACCESS_KEY:?SUPABASE_S3_SECRET_ACCESS_KEY is required}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD is required}"

export AWS_ACCESS_KEY_ID="$SUPABASE_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$SUPABASE_S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${SUPABASE_S3_REGION:-us-east-1}"

mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

aws s3 sync "s3://application-files" "$tmp/application-files" --endpoint-url "$SUPABASE_S3_ENDPOINT" --no-progress
archive="backups/othacks-storage-${stamp}.tar.gz"
tar -C "$tmp" -czf "$archive" application-files
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$archive" -out "${archive}.enc" -pass env:BACKUP_ENCRYPTION_PASSWORD
rm -f "$archive"
echo "Created ${archive}.enc"
