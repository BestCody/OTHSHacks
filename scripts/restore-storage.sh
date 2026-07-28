#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 BACKUP.tar.gz.enc" >&2
  exit 2
fi
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD is required}"
: "${SUPABASE_S3_ENDPOINT:?SUPABASE_S3_ENDPOINT is required}"
: "${SUPABASE_S3_ACCESS_KEY_ID:?SUPABASE_S3_ACCESS_KEY_ID is required}"
: "${SUPABASE_S3_SECRET_ACCESS_KEY:?SUPABASE_S3_SECRET_ACCESS_KEY is required}"

export AWS_ACCESS_KEY_ID="$SUPABASE_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$SUPABASE_S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${SUPABASE_S3_REGION:-us-east-1}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -in "$1" -out "$tmp/storage.tar.gz" -pass env:BACKUP_ENCRYPTION_PASSWORD
tar -C "$tmp" -xzf "$tmp/storage.tar.gz"
aws s3 sync "$tmp/application-files" "s3://application-files" --endpoint-url "$SUPABASE_S3_ENDPOINT" --no-progress

echo "Storage restore completed. Compare object counts and test signed downloads."
