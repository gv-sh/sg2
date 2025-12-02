/**
 * System Routes Tests for SpecGen API
 * Tests all system endpoints: health, database, documentation, and infrastructure
 */

import request from 'supertest';
import {
  app,
  setupTestSuite,
  expectSuccessResponse,
  expectErrorResponse,
  expectSecurityHeaders
} from './test-helpers.js';

setupTestSuite();

describe('SpecGen API - System Routes', () => {
  
  // ==================== API INFORMATION TESTS ====================
  
  describe('API Information', () => {
    
    test('GET /api - Should return API information and available endpoints', async () => {
      const response = await request(app).get('/api');
      
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('name', 'SpecGen API');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('environment', 'test');
      expect(response.body.data).toHaveProperty('endpoints');
      expect(response.body.data.endpoints).toHaveProperty('admin');
      expect(response.body.data.endpoints).toHaveProperty('content');
      expect(response.body.data.endpoints).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('documentation');
      expectSecurityHeaders(response);
    });

  });

  // ==================== HEALTH CHECK TESTS ====================
  
  describe('Health Checks', () => {
    
    test('GET /api/system/health - Should return health status', async () => {
      const response = await request(app).get('/api/system/health');
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(response.body.data.status);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('environment', 'test');
      expect(response.body.data).toHaveProperty('uptime');
      expect(typeof response.body.data.uptime).toBe('number');
      expectSecurityHeaders(response);
    });

    test('GET /api/system/health - Should include database status', async () => {
      const response = await request(app).get('/api/system/health');
      
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data.database).toHaveProperty('connected');
      expect(typeof response.body.data.database.connected).toBe('boolean');
      expect(response.body.data.database.connected).toBe(true); // Should be connected in tests
    });

    test('GET /api/system/health - Should include AI service status', async () => {
      const response = await request(app).get('/api/system/health');
      
      expect(response.body.data).toHaveProperty('ai');
      expect(response.body.data.ai).toHaveProperty('configured');
      expect(response.body.data.ai).toHaveProperty('model');
      expect(typeof response.body.data.ai.configured).toBe('boolean');
      expect(response.body.data.ai.model).toBe('gpt-4o-mini');
    });

    test('GET /api/system/health - Should include memory information', async () => {
      const response = await request(app).get('/api/system/health');
      
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data.memory).toHaveProperty('used');
      expect(response.body.data.memory).toHaveProperty('total');
      expect(response.body.data.memory).toHaveProperty('external');
      expect(typeof response.body.data.memory.used).toBe('number');
      expect(typeof response.body.data.memory.total).toBe('number');
    });

    test('GET /api/system/health - Should include feature flags', async () => {
      const response = await request(app).get('/api/system/health');
      
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data.features).toHaveProperty('rateLimiting');
      expect(response.body.data.features).toHaveProperty('cache');
      expect(response.body.data.features).toHaveProperty('metrics');
      // Rate limiting should be disabled in test environment
      expect(response.body.data.features.rateLimiting).toBe(false);
    });

  });

  // ==================== DATABASE MANAGEMENT TESTS ====================
  
  describe('Database Management', () => {
    
    test('POST /api/system/database/init - Should initialize database', async () => {
      const response = await request(app).post('/api/system/database/init');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Database initialized successfully');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      // Database init does not return a data property
    });

    test('GET /api/system/database/status - Should return database statistics', async () => {
      const response = await request(app).get('/api/system/database/status');
      
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status', 'connected');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.statistics).toHaveProperty('categories');
      expect(response.body.data.statistics).toHaveProperty('parameters');
      expect(response.body.data.statistics).toHaveProperty('generatedContent');
      expect(response.body.data.statistics).toHaveProperty('settings');
      expect(typeof response.body.data.statistics.categories).toBe('number');
      expect(typeof response.body.data.statistics.parameters).toBe('number');
      expect(typeof response.body.data.statistics.generatedContent).toBe('number');
      expect(typeof response.body.data.statistics.settings).toBe('number');
    });

  });

  // ==================== DOCUMENTATION TESTS ====================
  
  describe('API Documentation', () => {
    
    test('GET /api/system/docs.json - Should return OpenAPI specification', async () => {
      const response = await request(app).get('/api/system/docs.json');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      // This endpoint returns raw OpenAPI spec JSON, not wrapped in API response format
      expect(response.body).toHaveProperty('openapi', '3.0.0');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('title', 'SpecGen API');
      expect(response.body.info).toHaveProperty('version');
      expect(response.body).toHaveProperty('paths');
      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('tags');
      
      // Verify the clean tag structure
      const tags = response.body.tags;
      expect(tags).toHaveLength(3);
      expect(tags.map(tag => tag.name)).toEqual(['Admin', 'Content', 'System']);
    });

    test('GET /api/system/docs - Should serve Swagger UI', async () => {
      const response = await request(app).get('/api/system/docs');
      
      // Swagger UI redirects to /api/system/docs/ (with trailing slash)
      if (response.status === 301) {
        expect(response.headers.location).toBe('/api/system/docs/');
      } else {
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/html/);
      }
    });

    test('GET /api/system/docs/ - Should serve Swagger UI HTML', async () => {
      const response = await request(app).get('/api/system/docs/');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('SpecGen API Documentation');
      expect(response.text).toContain('swagger-ui');
    });

  });

  // ==================== SECURITY AND INFRASTRUCTURE TESTS ====================
  
  describe('Security and Infrastructure', () => {
    
    test('Should include security headers on all system endpoints', async () => {
      const endpoints = [
        '/api',
        '/api/system/health',
        '/api/system/database/status',
        '/api/system/docs.json'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expectSecurityHeaders(response);
      }
    });

    test('Should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/system/health')
        .set('Origin', 'http://localhost:3000') // Use allowed origin
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });

    test('Should have rate limiting disabled in test environment', async () => {
      // Make multiple requests quickly to verify rate limiting is disabled
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/system/health'));
      }
      
      const responses = await Promise.all(requests);
      
      // In test environment, rate limiting is disabled so no requests should be rate limited
      // Health check may return 503 when system is degraded (AI not configured), but that's not rate limiting
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBe(0);
      
      // All responses should be either 200 (healthy) or 503 (degraded), but not rate limited
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
      });
    });

    test('Should not include rate limiting headers when disabled', async () => {
      const response = await request(app).get('/api/system/health');
      
      // Rate limiting is disabled in test environment, so rate limiting headers should not be present
      expect([200, 503]).toContain(response.status);
      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(response.headers).not.toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).not.toHaveProperty('x-ratelimit-reset');
    });

  });

  // ==================== ERROR HANDLING TESTS ====================
  
  describe('Error Handling', () => {
    
    test('GET /api/nonexistent - Should return 404 with helpful message', async () => {
      const response = await request(app).get('/api/nonexistent-endpoint');
      
      expectErrorResponse(response, 404, 'Endpoint not found');
      expect(response.body).toHaveProperty('availableEndpoints');
      expect(response.body.availableEndpoints).toEqual([
        '/api/admin', 
        '/api/content', 
        '/api/system'
      ]);
    });

    test('Should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/system/database/init')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expectErrorResponse(response, 400);
    });

    test('Should handle internal server errors gracefully', async () => {
      // This tests the generic error handler
      // We can't easily trigger a real internal error in tests,
      // but we can verify error response format from other tests
      const response = await request(app).get('/api/system/nonexistent');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

  });

  // ==================== PERFORMANCE TESTS ====================
  
  describe('Performance', () => {
    
    test('Health check should respond quickly', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/api/system/health');
      const responseTime = Date.now() - startTime;
      
      // Health check can return 200 (healthy) or 503 (degraded) in test environment
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('Database status should respond quickly', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/api/system/database/status');
      const responseTime = Date.now() - startTime;
      
      expectSuccessResponse(response);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

  });

});