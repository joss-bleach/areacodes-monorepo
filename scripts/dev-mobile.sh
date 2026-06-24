#!/usr/bin/env bash
# Starts Convex dev and Expo Go concurrently for mobile development.
set -euo pipefail

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

echo "Starting Expo Go..."
bun run --cwd "$ROOT/apps/mobile" dev -- --go &
PIDS+=($!)

echo ""
echo "Auth: https://sensible-orca-923.eu-west-1.convex.site"
echo ""
echo "All services running. Press Ctrl+C to stop."
wait
