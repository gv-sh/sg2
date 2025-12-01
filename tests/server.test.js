/**
 * Server and System Tests for SpecGen
 * Tests system endpoints, health checks, database operations, and error handling
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';

import app from '../src/server/server.ts';
import { dataService } from '../src/server/services.ts';
import config from '../src/server/config.ts';

global.jest = jest;

const TEST_DB_PATH = config.getDatabasePath();

async function initTestDatabase() {
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // File might not exist, that's ok
  }
  await dataService.init();
}

async function cleanupTestDatabase() {
  try {
    await dataService.close();
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // Ignore cleanup errors
  }
}

beforeAll(async () => {
  await initTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

beforeEach(async () => {
  await initTestDatabase();
});

describe('SpecGen Server - System Endpoints', () => {
  test('GET / - Should serve HTML file or handle gracefully', async () => {
    const response = await request(app).get('/');
    
    expect([200, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.headers['content-type']).toMatch(/html/);
    }
  });

  test('GET /api/system/health - Should return health status', async () => {
    const response = await request(app).get('/api/system/health');
    
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body.success).toBeDefined();
    expect(response.body.data.status).toMatch(/^(ok|degraded)$/);
    expect(response.body.data.database).toBe('connected');
    expect(response.body.data.environment).toBe('test');
    expect(typeof response.body.data.uptime).toBe('number');
  });

  test('POST /api/system/database/init - Should initialize database', async () => {
    const response = await request(app).post('/api/system/database/init');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Database initialized successfully');
  });

  test('GET /api/system/database/status - Should return database statistics', async () => {
    const response = await request(app).get('/api/system/database/status');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('connected');
    expect(response.body.data.statistics).toHaveProperty('categories');
    expect(response.body.data.statistics).toHaveProperty('parameters');
    expect(typeof response.body.data.statistics.categories).toBe('number');
  });

  test('GET /api/system/docs.json - Should return OpenAPI specification', async () => {
    const response = await request(app).get('/api/system/docs.json');
    
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
    expect(response.body.info.title).toBe('SpecGen API');
    expect(response.body.paths).toBeDefined();
  });

  test('GET /api/health/ping - Should return pong', async () => {
    const response = await request(app).get('/api/health/ping');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('pong');
  });
});

describe('SpecGen Server - Error Handling', () => {
  test('GET /api/nonexistent - Should return 404 with helpful message', async () => {
    const response = await request(app).get('/api/nonexistent-endpoint');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Endpoint not found');
    expect(response.body.availableEndpoints).toEqual([
      '/api/admin', 
      '/api/content', 
      '/api/system'
    ]);
  });

  test('Should handle validation errors properly', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({ name: '' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toBeDefined();
  });

  test('Should handle Boom errors properly', async () => {
    const response = await request(app).get('/api/admin/categories/non-existent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('Should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    
    expect(response.status).toBe(400);
  });

  test('Should handle large payloads within limits', async () => {
    const largeDescription = 'x'.repeat(400);
    
    const response = await request(app)
      .post('/api/admin/categories')
      .send({
        name: 'Large Category',
        description: largeDescription
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

describe('SpecGen Server - CORS and Security Headers', () => {
  test('Should include security headers', async () => {
    const response = await request(app).get('/api/system/health');
    
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-xss-protection');
  });

  test('Should handle CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/system/health')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET');
    
    expect(response.status).toBe(204);
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});

describe('SpecGen Server - Rate Limiting', () => {
  test('Should have rate limiting disabled in test environment', async () => {
    // Make multiple requests quickly to verify rate limiting is disabled in tests
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(request(app).get('/api/system/health'));
    }
    
    const responses = await Promise.all(requests);
    const successfulResponses = responses.filter(r => r.status === 200);
    
    // All requests should succeed in test environment (rate limiting disabled)
    expect(successfulResponses.length).toBe(10);
    
    // No requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBe(0);
  });
});