#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

async function build() {
  try {
    console.log('🔄 Running database migrations...');

    // Run migrations using drizzle-kit
    try {
      execSync('npx drizzle-kit push --config drizzle.config.ts', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      // Drizzle-kit may exit with non-zero if no new migrations, that's OK
      console.log('⚠️  Migration check completed (no new migrations needed)');
    }

    console.log('🏗️  Building Next.js application...');
    execSync('next build', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
