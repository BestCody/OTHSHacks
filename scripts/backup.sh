#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_ENCRYPTION_PASSWORD:?BACKUP_ENCRYPTION_PASSWORD is required}"

mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
plain="backups/othacks-${stamp}.sql"
compressed="${plain}.gz"
encrypted="${compressed}.enc"

supabase db dump --db-url "$SUPABASE_DB_URL" --file "$plain"
gzip -9 "$plain"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$compressed" -out "$encrypted" -pass env:BACKUP_ENCRYPTION_PASSWORD
rm -f "$compressed"
echo "Created $encrypted"
