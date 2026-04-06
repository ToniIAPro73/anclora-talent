#!/bin/bash

# Run database migrations before build
echo "🔄 Running database migrations..."
if npx drizzle-kit push --config drizzle.config.ts 2>&1; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migration warning (continuing with build)"
  # Don't fail the build if migrations have issues
fi

# Run the Next.js build
echo "🏗️  Building Next.js application..."
npm run build
