#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/.bin/prisma migrate deploy

echo "Starting server..."
exec node server.js
