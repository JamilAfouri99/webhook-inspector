#!/usr/bin/env bash
#
# Webhook Tester — One command to run everything
#
# Usage:
#   ./start.sh              # Dev mode (hot reload)
#   ./start.sh prod         # Production (single Docker container for EC2)
#   ./start.sh --port 4200  # Custom port
#
# Stop: ./stop.sh or Ctrl+C

set -e
cd "$(dirname "$0")"

PORT=4100
MODE="dev"

while [[ $# -gt 0 ]]; do
  case "$1" in
    prod|production) MODE="prod"; shift ;;
    --port)    PORT="$2"; shift 2 ;;
    --port=*)  PORT="${1#*=}"; shift ;;
    -h|--help)
      echo ""
      echo "  Usage:"
      echo "    ./start.sh              Dev (hot reload + DB in Docker)"
      echo "    ./start.sh prod         Production (single container for EC2)"
      echo "    ./start.sh --port 4200  Custom port"
      echo ""
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "  ERROR: Docker not installed. https://docs.docker.com/get-docker/"; exit 1
fi
if ! docker info &>/dev/null; then
  echo "  ERROR: Docker not running. Start Docker Desktop."; exit 1
fi

# ── Production: single container (app + DB) ──────────────────
if [ "$MODE" = "prod" ]; then
  echo ""
  echo "  Building production container (app + DB)..."
  docker build -t webhook-tester .
  echo ""
  echo "  Starting..."
  docker run -d --name webhook-tester \
    -p $PORT:4100 \
    -v webhook-tester-data:/var/lib/postgresql/data \
    webhook-tester
  echo ""
  echo "  Webhook Tester (Production)"
  echo "  http://localhost:$PORT"
  echo ""
  echo "  Logs:  docker logs -f webhook-tester"
  echo "  Stop:  ./stop.sh prod"
  echo ""
  exit 0
fi

# ── Dev: DB in Docker, app runs locally ──────────────────────

# Start PostgreSQL
if ! docker compose ps db 2>/dev/null | grep -q "running"; then
  echo "  Starting PostgreSQL..."
  docker compose up -d db
  echo -n "  Waiting for DB"
  for i in $(seq 1 20); do
    if docker compose exec -T db pg_isready -U webhook -d webhook_tester &>/dev/null; then
      echo " ready."; break
    fi
    echo -n "."; sleep 1
    [ "$i" -eq 20 ] && echo " timeout!" && exit 1
  done
else
  echo "  PostgreSQL already running."
fi

# Setup
[ ! -f ".env" ] && cp .env.example .env && echo "  Created .env"
[ ! -d "node_modules" ] && echo "  Installing dependencies..." && npm install
[ ! -d "node_modules/.prisma/client" ] && npx prisma generate

# Migrations
echo "  Running migrations..."
DATABASE_URL="postgres://webhook:webhook_local@localhost:5433/webhook_tester" npx prisma db push --skip-generate 2>&1 | grep -v "^$" | sed 's/^/  /'

# Kill existing
EXISTING=$(lsof -ti:$PORT 2>/dev/null || true)
[ -n "$EXISTING" ] && echo "$EXISTING" | xargs kill -9 2>/dev/null || true
rm -f .next/dev/lock

echo ""
echo "  Webhook Tester (Dev)"
echo "  http://localhost:$PORT"
echo "  Webhook URL: http://localhost:$PORT/api/webhook/{slug}"
echo ""

DATABASE_URL="postgres://webhook:webhook_local@localhost:5433/webhook_tester" PORT=$PORT npx next dev -p "$PORT"
