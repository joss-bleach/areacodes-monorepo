#!/usr/bin/env bash
# Usage: bash scripts/setup-env.sh [path/to/master.env]
# Defaults to ~/.areacodes.env if no arg given.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MASTER="${1:-$HOME/.areacodes.env}"

if [[ ! -f "$MASTER" ]]; then
  echo "❌  Master env not found: $MASTER"
  echo ""
  echo "   Copy the template and fill in your values:"
  echo "   cp $ROOT/.env.master.example $MASTER"
  exit 1
fi

# Read master file into an associative array
declare -A SECRETS
while IFS='=' read -r key value; do
  # Skip comments and blank lines
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$key" ]] && continue
  key="${key%%[[:space:]]*}"          # trim trailing whitespace from key
  value="${value#"${value%%[! ]*}"}"  # trim leading whitespace from value
  SECRETS["$key"]="$value"
done < "$MASTER"

# Populate a .env file from its .env.example, substituting values from SECRETS.
# Args: $1 = destination .env, $2 = source .env.example
populate() {
  local dest="$1"
  local example="$2"

  if [[ ! -f "$example" ]]; then
    return
  fi

  local output=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
      output+="$line"$'\n'
      continue
    fi

    local key="${line%%=*}"
    key="${key%%[[:space:]]*}"

    if [[ -n "$key" && -v SECRETS["$key"] && -n "${SECRETS[$key]}" ]]; then
      output+="${key}=${SECRETS[$key]}"$'\n'
    else
      output+="$line"$'\n'
    fi
  done < "$example"

  printf '%s' "$output" > "$dest"
  echo "  ✓  $dest"
}

echo "🔑  Loading env from: $MASTER"
echo ""

# --- apps ---
populate "$ROOT/apps/business/.env"     "$ROOT/apps/business/.env.example"
populate "$ROOT/apps/admin/.env"        "$ROOT/apps/admin/.env.example"
populate "$ROOT/apps/map/.env"          "$ROOT/apps/map/.env.example"

# --- packages/convex ---
# No .env.example — write directly from known keys
CONVEX_ENV="$ROOT/packages/convex/.env.local"
{
  echo "# Deployment used by \`npx convex dev\`"
  [[ -n "${SECRETS[CONVEX_DEPLOYMENT]:-}" ]] && echo "CONVEX_DEPLOYMENT=${SECRETS[CONVEX_DEPLOYMENT]}" || echo "CONVEX_DEPLOYMENT="
  echo ""
  [[ -n "${SECRETS[CONVEX_URL]:-}" ]] && echo "CONVEX_URL=${SECRETS[CONVEX_URL]}" || echo "CONVEX_URL="
} > "$CONVEX_ENV"
echo "  ✓  $CONVEX_ENV"

# --- apps/mobile ---
# No .env.example — write directly
MOBILE_ENV="$ROOT/apps/mobile/.env"
{
  echo "# Set to tunnel URL once running: bun run scripts/set-tunnel-url.sh <url>"
  [[ -n "${SECRETS[EXPO_PUBLIC_CONVEX_SITE_URL]:-}" ]] && echo "EXPO_PUBLIC_CONVEX_SITE_URL=${SECRETS[EXPO_PUBLIC_CONVEX_SITE_URL]}" || echo "EXPO_PUBLIC_CONVEX_SITE_URL="
  [[ -n "${SECRETS[EXPO_PUBLIC_CONVEX_URL]:-}" ]]      && echo "EXPO_PUBLIC_CONVEX_URL=${SECRETS[EXPO_PUBLIC_CONVEX_URL]}"           || echo "EXPO_PUBLIC_CONVEX_URL="
  [[ -n "${SECRETS[EXPO_PUBLIC_POSTHOG_API_KEY]:-}" ]] && echo "EXPO_PUBLIC_POSTHOG_API_KEY=${SECRETS[EXPO_PUBLIC_POSTHOG_API_KEY]}" || echo "EXPO_PUBLIC_POSTHOG_API_KEY="
  echo "EXPO_PUBLIC_POSTHOG_HOST=${SECRETS[EXPO_PUBLIC_POSTHOG_HOST]:-https://eu.i.posthog.com}"
} > "$MOBILE_ENV"
echo "  ✓  $MOBILE_ENV"

# --- apps/e2e ---
E2E_ENV="$ROOT/apps/e2e/.env"
{
  [[ -n "${SECRETS[E2E_TEST_EMAIL]:-}" ]]    && echo "E2E_TEST_EMAIL=${SECRETS[E2E_TEST_EMAIL]}"       || echo "E2E_TEST_EMAIL="
  [[ -n "${SECRETS[E2E_TEST_PASSWORD]:-}" ]] && echo "E2E_TEST_PASSWORD=${SECRETS[E2E_TEST_PASSWORD]}" || echo "E2E_TEST_PASSWORD="
} > "$E2E_ENV"
echo "  ✓  $E2E_ENV"

# --- .sandcastle ---
populate "$ROOT/.sandcastle/.env" "$ROOT/.sandcastle/.env.example"

echo ""
echo "✅  Done. All env files populated."
