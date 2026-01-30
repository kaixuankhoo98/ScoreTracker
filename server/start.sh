#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Seeding database (if needed)..."
npx prisma db seed || true

echo "Starting server..."
exec node dist/server/src/index.js
