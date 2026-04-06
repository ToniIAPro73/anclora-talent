#!/usr/bin/env node

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
