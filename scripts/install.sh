#!/usr/bin/env bash
# OnTime self-hosted install script
# Usage: curl -sSL https://your-server/install.sh | bash
set -euo pipefail

echo "=== OnTime Self-Hosted Installer ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker required. Install from https://docs.docker.com/get-docker/"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "Docker Compose required."; exit 1; }

# Generate secrets if .env doesn't exist
if [ ! -f .env ]; then
  echo "Generating .env from .env.example..."
  cp .env.example .env

  # Generate random secrets
  AUTH_SECRET=$(openssl rand -hex 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)

  sed -i "s/change-me-to-a-random-32-char-secret/$AUTH_SECRET/g" .env
  sed -i "s/0000000000000000000000000000000000000000000000000000000000000000/$ENCRYPTION_KEY/g" .env

  echo "Generated secrets. Review .env before continuing."
fi

echo "Starting services..."
docker compose up -d --wait

echo "Running database migrations..."
# Allow postgres to fully initialize
sleep 3
docker compose exec -T postgres psql -U ontime -d ontime -f /docker-entrypoint-initdb.d/00-init.sql 2>/dev/null || true

echo ""
echo "OnTime is running!"
echo "  API:     http://localhost:3001"
echo "  Web:     http://localhost:3000 (after running pnpm --filter=@ontime/web start)"
echo "  MinIO:   http://localhost:9001"
echo ""
echo "Next: run 'pnpm db:migrate' to apply the database schema."
