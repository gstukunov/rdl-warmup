#!/bin/sh
set -e

echo "🚀 Starting application..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until nc -z $DB_HOST $DB_PORT; do
  sleep 1
done
echo "✅ Database is ready"

# Run migrations (using compiled JS from dist/src)
echo "🗄️ Running migrations..."
node ./node_modules/typeorm/cli.js -d dist/src/typeorm.config.js migration:run || {
  echo "⚠️ Migration failed or already up to date"
}

# Start application
echo "▶️ Starting NestJS application..."
exec node dist/src/main
