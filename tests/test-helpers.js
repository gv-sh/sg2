/**
 * Shared Test Utilities for SpecGen API Tests
 * Common database setup, teardown, and helper functions
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import app from '../src/server/server.js';
import { dataService } from '../src/server/services.js';
import config from '../src/server/config.js';

global.jest = jest;

const TEST_DB_PATH = config.getDatabasePath();

// Database management functions
export async function initTestDatabase() {
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // File might not exist, that's ok
  }
  await dataService.init();
}

export async function cleanupTestDatabase() {
  try {
    await dataService.close();
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Test data factories
export function createCategoryData(overrides = {}) {
  return {
    name: 'Test Category',
    description: 'A test category for testing',
    ...overrides
  };
}

export function createParameterData(categoryId, overrides = {}) {
  return {
    name: 'Test Parameter',
    description: 'A test parameter for testing',
    type: 'text',
    category_id: categoryId,
    ...overrides
  };
}

export function createContentGenerationData(overrides = {}) {
  return {
    parameters: {
      genre: 'science-fiction',
      setting: 'future-city'
    },
    year: 2050,
    ...overrides
  };
}

// API response validation helpers
export function expectSuccessResponse(response, expectedStatus = 200, expectData = true) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('message');
  if (expectData) {
    expect(response.body).toHaveProperty('data');
  }
}

export function expectErrorResponse(response, expectedStatus, errorMessage = null) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
}

export function expectValidationError(response) {
  expectErrorResponse(response, 400, 'Validation failed'); // Match exact validation error message
  // Details property is optional - some validation errors may not include it
}

export function expectNotFoundError(response) {
  expectErrorResponse(response, 404, 'not found');
}

// Security headers validation
export function expectSecurityHeaders(response) {
  expect(response.headers).toHaveProperty('x-content-type-options');
  expect(response.headers).toHaveProperty('x-frame-options');
  expect(response.headers).toHaveProperty('x-xss-protection');
}

// Common test setup functions
export function setupTestSuite() {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await initTestDatabase();
  });
}

// Export the app for testing
export { app };