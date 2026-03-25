#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function hasNext() {
  try {
    require.resolve('next/package.json');
    return true;
  } catch {
    return false;
  }
}

if (hasNext()) {
  console.log('next dependency found');
  process.exit(0);
}

console.log('Next.js dependency missing. Running `npm ci` automatically...');
const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const install = spawnSync(cmd, ['ci'], { stdio: 'inherit', shell: false });

if (install.status !== 0) {
  console.error('Automatic install failed. Please run `npm ci` manually and retry.');
  process.exit(1);
}

if (!hasNext()) {
  console.error('Dependencies installed but Next.js still not found. Run `npm ci` manually.');
  process.exit(1);
}

console.log('Dependencies installed successfully. Continuing build...');
