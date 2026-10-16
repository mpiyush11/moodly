#!/usr/bin/env bash
# Codespaces lifecycle only: no manual install/env/database/start commands.
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${1:-start}"
if [[ "$MODE" != "start" && "$MODE" != "--prepare" && "$MODE" != "--foreground" ]]; then
  echo '[Moodly] Invalid lifecycle mode.' >&2
  exit 1
fi
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo '[Moodly] Codespaces auto-start is development-only; production setup is not changed.' >&2
  exit 1
fi

mkdir -p .data
# Concurrent lifecycle calls cannot install/start a second copy.
exec 9>.data/codespaces-start.lock
flock 9

STAMP=".data/codespaces-dependencies.sha256"
SIGNATURE="$(sha256sum package-lock.json | cut -d ' ' -f 1):$(node --version)"
PREVIOUS="$(cat "$STAMP" 2>/dev/null || true)"
if [[ "$SIGNATURE" != "$PREVIOUS" || ! -x node_modules/.bin/next || ! -f node_modules/@next/env/package.json || ! -f node_modules/postgres/package.json ]]; then
  echo '[Moodly] Installing the locked dependencies automatically...'
  npm ci --no-audit --no-fund
  printf '%s\n' "$SIGNATURE" > "$STAMP"
fi
# This preserves existing owner configuration and creates missing test defaults.
node scripts/setup-env.mjs
if [[ "$MODE" == "--prepare" ]]; then
  echo '[Moodly] Dependencies and environment are ready. The start hook will launch the website.'
  exit 0
fi

ready() {
  curl --silent --fail --connect-timeout 1 --max-time 5 http://127.0.0.1:3000/api/store 2>/dev/null |
    node -e 'let text="";process.stdin.on("data",chunk=>text+=chunk);process.stdin.on("end",()=>{try{const data=JSON.parse(text);process.exit(Array.isArray(data.products)&&Array.isArray(data.inventory)&&data.settings&&typeof data.demo==="boolean"?0:1);}catch{process.exit(1);}});'
}
print_ready() {
  echo '[Moodly] Website ready on port 3000. No terminal commands are needed.'
  if [[ -n "${CODESPACE_NAME:-}" ]]; then
    printf '[Moodly] Testing URL: https://%s-3000.%s\n' "$CODESPACE_NAME" "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  fi
}
if ready; then
  echo '[Moodly] Existing website reused; no duplicate server started.'
  print_ready
  exit 0
fi

# This mode is for a terminal/agent supervising the same startup pipeline.
if [[ "$MODE" == "--foreground" ]]; then
  echo '[Moodly] Starting the development website and automatic database setup...'
  exec npm run dev 9>&-
fi

LOG=".data/codespaces-dev.log"
PID_FILE=".data/codespaces-dev.pid"
echo '[Moodly] Starting the website; environment and database setup run automatically...'
# Release the install lock in the child, and detach from the short lifecycle hook.
nohup npm run dev > "$LOG" 2>&1 < /dev/null 9>&- &
SERVER_PID=$!
printf '%s\n' "$SERVER_PID" > "$PID_FILE"

for ((attempt=1; attempt<=60; attempt++)); do
  if ready; then
    print_ready
    exit 0
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[Moodly] Startup failed. Details are in $LOG." >&2
    tail -n 25 "$LOG" >&2 || true
    rm -f "$PID_FILE"
    exit 1
  fi
  sleep 2
done

echo "[Moodly] Startup did not become ready in time. Check $LOG and Codespaces network access." >&2
exit 1
