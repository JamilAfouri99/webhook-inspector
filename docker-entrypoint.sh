#!/usr/bin/env bash
set -e

PGDATA="/var/lib/postgresql/data"
DB_NAME="webhook_tester"
DB_USER="${DB_USER:-webhook}"
DB_PASS="${DB_PASS:-webhook_local}"

# ── 1. Initialize PostgreSQL if needed ───────────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[entrypoint] Initializing PostgreSQL..."
  su-exec postgres initdb -D "$PGDATA" --auth=trust --no-locale --encoding=UTF8

  cat > "$PGDATA/pg_hba.conf" <<EOF
local   all   all                 trust
host    all   all   127.0.0.1/32  md5
host    all   all   ::1/128       md5
EOF

  echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
  echo "unix_socket_directories = '/run/postgresql'" >> "$PGDATA/postgresql.conf"
fi

# ── 2. Start PostgreSQL ─────────────────────────────────────
echo "[entrypoint] Starting PostgreSQL..."
su-exec postgres pg_ctl -D "$PGDATA" -l /var/lib/postgresql/pg.log start -w -t 30

# ── 3. Create user and database if needed ────────────────────
if ! su-exec postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "[entrypoint] Creating user $DB_USER..."
  su-exec postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

if ! su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo "[entrypoint] Creating database $DB_NAME..."
  su-exec postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

# ── 4. Run Prisma migrations ────────────────────────────────
echo "[entrypoint] Running Prisma migrations..."
export DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
npx prisma db push --skip-generate 2>&1 || true

# ── 5. Start Next.js ────────────────────────────────────────
echo "[entrypoint] Starting Next.js on port ${PORT:-4100}..."
exec node server.js
