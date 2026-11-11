#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== [1/4] Validating Docker Compose configuration ==="
docker compose config -q
echo "Docker Compose syntax OK."

echo "=== [2/4] Running Backend Alembic Migration ==="
(cd backend && .venv/bin/alembic upgrade head)

echo "=== [3/4] Running Backend Pytest Suite ==="
(cd backend && .venv/bin/pytest -v)

echo "=== [4/4] Running Frontend TypeScript Check ==="
(cd frontend && npm run typecheck)

echo "=== Phase 1 Verification Completed Successfully ==="
