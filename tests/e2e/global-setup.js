/**
 * Global setup for Playwright tests
 * Ensures server is ready and database is initialized
 */

import { waitForServer, initializeDatabase } from './utils/api-helpers.js';

async function globalSetup() {
  console.log('🔄 Waiting for server to be ready...');
  
  try {
    // Wait for server to be ready
    await waitForServer(30, 2000); // 30 attempts, 2 seconds apart
    console.log('✅ Server is ready!');

    // Initialize database with clean state
    console.log('🔄 Initializing test database...');
    await initializeDatabase();
    console.log('✅ Test database initialized!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}

export default globalSetup;