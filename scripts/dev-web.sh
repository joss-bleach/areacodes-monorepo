#!/usr/bin/env bash
# Usage: bash scripts/dev-web.sh <app> <port>
#   e.g. bash scripts/dev-web.sh business 3000
set -euo pipefail

APP="${1:-}"
PORT="${2:-}"

if [[ -z "$APP" || -z "$PORT" ]]; then
  echo "Usage: $0 <app> <port>"
  echo "  e.g. $0 business 3000"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Starting Convex dev..."
(cd "$ROOT/packages/convex" && bunx convex dev) &
PIDS+=($!)

echo "Starting $APP app (port $PORT)..."
bun run --cwd "$ROOT/apps/$APP" dev &
PIDS+=($!)

echo ""
echo "Auth: https://sensible-orca-923.eu-west-1.convex.site"
echo "App:  http://localhost:$PORT"
echo ""
echo "All services running. Press Ctrl+C to stop."
wait
