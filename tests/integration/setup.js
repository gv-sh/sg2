/**
 * Setup script for integration tests
 * Initializes test database and ensures clean state
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE_URL });

async function waitForServer(maxRetries = 30, interval = 1000) {
  console.log('Waiting for server to be ready...');
  let retries = maxRetries;

  while (retries > 0) {
    try {
      const response = await api.get('/api/system/health');
      if (response.status === 200) {
        console.log('Server is ready!');
        return true;
      }
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error('Server did not become ready in time');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

async function initializeDatabase() {
  console.log('Checking database status...');

  try {
    const statusResponse = await api.get('/api/system/database/status');

    if (!statusResponse.data.initialized) {
      console.log('Initializing database...');
      await api.post('/api/system/database/init');
      console.log('Database initialized successfully!');
    } else {
      console.log('Database already initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
}

async function setup() {
  try {
    await waitForServer();
    await initializeDatabase();
    console.log('Setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
