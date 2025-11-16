#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_CHOICE="${1:-}"

if [[ -z "$ENV_CHOICE" ]]; then
  cat <<'EOF'
Usage: bash scripts/migrate.sh <sandbox|production>

Ensures .env.local and Supabase link are targeting the requested environment,
then runs `npm run db:migrate`.
EOF
  exit 1
fi

bash "$ROOT_DIR/scripts/use-env.sh" "$ENV_CHOICE"

echo "Running database migrations against $ENV_CHOICE..."
(cd "$ROOT_DIR" && npm run db:migrate)
echo "Migrations complete for $ENV_CHOICE."
