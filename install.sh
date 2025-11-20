#!/usr/bin/env bash
set -euo pipefail

# Easy installer for the frontend (Vite + React)
# - Installs npm dependencies
# - Writes a default .env if missing
#
# Usage: bash install.sh

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if ! command -v npm >/dev/null 2>&1; then
  echo "[!] npm is not installed. Install Node.js 18+ and retry."
  exit 1
fi

# Install dependencies
echo "[+] Installing frontend dependencies"
npm install

# Create .env with defaults if missing
if [ ! -f .env ]; then
  cat > .env <<'EOF'
# Frontend .env
VITE_BACKEND_URL=http://localhost:8000
EOF
  echo "[+] Wrote frontend .env with defaults"
else
  echo "[i] Existing frontend .env detected — leaving it unchanged"
fi

cat <<'NEXT'

✅ Frontend install complete.

Next steps:
1) Start the dev server:
   npm run dev
2) Open the app:
   http://localhost:3000
3) Ensure the backend is running at VITE_BACKEND_URL
NEXT
