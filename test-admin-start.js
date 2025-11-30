#!/usr/bin/env node
/**
 * Simple script to start admin interface for testing
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const adminPath = join(__dirname, 'admin');

console.log('Starting admin interface on port 3001...');
console.log('Admin path:', adminPath);

const adminProcess = spawn('npm', ['start'], {
  cwd: adminPath,
  env: {
    ...process.env,
    PORT: '3001'
  },
  stdio: 'inherit'
});

adminProcess.on('exit', (code) => {
  console.log(`Admin interface exited with code ${code}`);
});

adminProcess.on('error', (error) => {
  console.error('Failed to start admin interface:', error);
});