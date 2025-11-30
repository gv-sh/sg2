#!/usr/bin/env node
/**
 * Manual cleanup script for test data pollution
 */

import { cleanupTestData } from './tests/e2e/utils/api-helpers.js';

console.log('🧹 Cleaning up test data...');

try {
  await cleanupTestData();
  console.log('✅ Test data cleanup completed successfully');
} catch (error) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
}