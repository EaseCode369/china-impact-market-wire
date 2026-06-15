#!/bin/zsh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "== 7x24 Live Feed Hourly Publisher =="
echo ""
echo "This script runs npm run live:publish once per hour."
echo "Keep this Terminal window open. Press Ctrl+C to stop."
echo ""

if ! command -v npm >/dev/null 2>&1; then
  echo "Start failed: npm was not found. Please install Node.js first."
  echo ""
  read "REPLY?Press Enter to close"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

while true; do
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running live publisher..."
  X_HEADLESS=1 npm run live:publish || true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Waiting 1 hour..."
  sleep 3600
done
