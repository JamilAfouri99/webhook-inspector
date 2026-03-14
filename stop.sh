#!/usr/bin/env bash
#
# Webhook Tester — Stop
#
# Usage:
#   ./stop.sh              # Stop dev app (DB stays)
#   ./stop.sh prod         # Stop production container
#   ./stop.sh all          # Stop everything

set -e
cd "$(dirname "$0")"

PORT=4100

if [ "${1:-}" = "prod" ]; then
  docker stop webhook-tester 2>/dev/null && docker rm webhook-tester 2>/dev/null
  echo "  Production container stopped."
  exit 0
fi

if [ "${1:-}" = "all" ]; then
  docker stop webhook-tester 2>/dev/null && docker rm webhook-tester 2>/dev/null || true
  docker compose down 2>/dev/null || true
  PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
  rm -f .next/dev/lock
  echo "  Everything stopped."
  exit 0
fi

# Dev mode
PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill -9 2>/dev/null || true
  echo "  Dev app stopped. DB still running."
else
  echo "  No dev app running on port $PORT."
fi
rm -f .next/dev/lock
