#!/bin/zsh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "== Finance News Local Start =="
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

echo "Generating latest content..."
npm run generate:all

echo ""
echo "Starting local site: http://localhost:3000"
echo "Press Ctrl+C to stop the server."
echo ""

npm run dev
