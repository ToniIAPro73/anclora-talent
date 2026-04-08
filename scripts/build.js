#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require('child_process');
const path = require('path');

async function build() {
  try {
    console.log('🔄 Running database migrations...');

    // Run direct SQL migrations
    try {
      execSync('node scripts/ensure-migrations.js', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (error) {
      console.error('⚠️  Migration warning:', error.message);
      // Continue with build even if migrations have issues
      // (they may already be applied)
    }

    console.log('🏗️  Building Next.js application...');
    // Use npx to ensure the local next binary is found
    execSync('npx next build', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
    });

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
