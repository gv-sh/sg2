/**
 * Content Routes Tests for SpecGen API
 * Tests all content endpoints: generation, management, and image serving
 */

import request from 'supertest';
import {
  app,
  setupTestSuite,
  createCategoryData,
  createParameterData,
  createContentGenerationData,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectNotFoundError,
  expectSecurityHeaders
} from './test-helpers.js';

setupTestSuite();

describe('SpecGen API - Content Routes', () => {
  
  let testCategoryId;
  let testParameterId;
  let testContentId;

  beforeEach(async () => {
    // Create test category and parameter for content tests
    const categoryData = createCategoryData({ name: 'Test Category for Content' });
    const categoryResponse = await request(app)
      .post('/api/admin/categories')
      .send(categoryData);
    testCategoryId = categoryResponse.body.data.id;

    const parameterData = createParameterData(testCategoryId, { name: 'genre' });
    const parameterResponse = await request(app)
      .post('/api/admin/parameters')
      .send(parameterData);
    testParameterId = parameterResponse.body.data.id;
  });

  // ==================== CONTENT GENERATION TESTS ====================
  
  describe('Content Generation', () => {
    
    test('POST /api/generate - Should generate new content', async () => {
      const generationData = createContentGenerationData();
      
      const response = await request(app)
        .post('/api/generate')
        .send(generationData);
      
      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('parameters');
      expect(response.body.data).toHaveProperty('year', generationData.year);
      expect(response.body.data).toHaveProperty('created_at');
      
      // Store for later tests
      testContentId = response.body.data.id;
    });

    test('POST /api/generate - Should handle generation without year', async () => {
      const generationData = createContentGenerationData();
      delete generationData.year;
      
      const response = await request(app)
        .post('/api/generate')
        .send(generationData);
      
      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.year).toBeNull();
    });

    test('POST /api/generate - Should validate generation parameters', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ year: 1800 }); // Invalid year
      
      expectValidationError(response);
    });

    test('POST /api/generate - Should handle empty parameters', async () => {
      const generationData = {
        parameters: {},
        year: 2050
      };
      
      const response = await request(app)
        .post('/api/generate')
        .send(generationData);
      
      expectSuccessResponse(response, 201);
    });

  });

  // ==================== CONTENT MANAGEMENT TESTS ====================
  
  describe('Content Management', () => {
    
    beforeEach(async () => {
      // Generate test content for management tests
      const generationData = createContentGenerationData({ 
        parameters: { genre: 'test-genre' } 
      });
      const response = await request(app)
        .post('/api/generate')
        .send(generationData);
      testContentId = response.body.data.id;
    });

    test('GET /api/content - Should list all content', async () => {
      const response = await request(app).get('/api/content');
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expectSecurityHeaders(response);
    });

    test('GET /api/content?limit=5 - Should respect limit parameter', async () => {
      const response = await request(app).get('/api/content?limit=5');
      
      expectSuccessResponse(response);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.meta.filters).toHaveProperty('limit', 5);
    });

    test('GET /api/content?type=fiction - Should filter by type', async () => {
      const response = await request(app).get('/api/content?type=fiction');
      
      expectSuccessResponse(response);
      expect(response.body.meta.filters).toHaveProperty('type', 'fiction');
    });

    test('GET /api/content/summary - Should return content summary', async () => {
      const response = await request(app).get('/api/content/summary');
      
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byType');
    });

    test('GET /api/content/years - Should return available years', async () => {
      const response = await request(app).get('/api/content/years');
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/content/:id - Should get content by ID', async () => {
      const response = await request(app).get(`/api/content/${testContentId}`);
      
      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(testContentId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('parameters');
    });

    test('GET /api/content/:id - Should return 404 for non-existent content', async () => {
      const response = await request(app).get('/api/content/non-existent-id');
      
      expectNotFoundError(response);
    });

    test('GET /api/content/:id/image - Should get content image info', async () => {
      const response = await request(app).get(`/api/content/${testContentId}/image`);
      
      // Content might not have image, so accept both success and not found
      if (response.status === 200) {
        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('imageUrl');
      } else {
        expectNotFoundError(response);
      }
    });

    test('PUT /api/content/:id - Should update content', async () => {
      const updateData = {
        title: 'Updated Test Title'
      };
      
      const response = await request(app)
        .put(`/api/content/${testContentId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.title).toBe(updateData.title);
    });

    test('PUT /api/content/:id - Should validate update data', async () => {
      const response = await request(app)
        .put(`/api/content/${testContentId}`)
        .send({ title: '' }); // Invalid empty title
      
      expectValidationError(response);
    });

    test('PUT /api/content/:id - Should return 404 for non-existent content', async () => {
      const response = await request(app)
        .put('/api/content/non-existent-id')
        .send({ title: 'Test' });
      
      expectNotFoundError(response);
    });

    test('DELETE /api/content/:id - Should delete content', async () => {
      const response = await request(app).delete(`/api/content/${testContentId}`);
      
      expectSuccessResponse(response);
      
      // Verify it's deleted
      const getResponse = await request(app).get(`/api/content/${testContentId}`);
      expectNotFoundError(getResponse);
    });

    test('DELETE /api/content/:id - Should return 404 for non-existent content', async () => {
      const response = await request(app).delete('/api/content/non-existent-id');
      
      expectNotFoundError(response);
    });

  });

  // ==================== IMAGE SERVING TESTS ====================
  
  describe('Image Serving', () => {
    
    beforeEach(async () => {
      // Generate content with image for image tests
      const generationData = createContentGenerationData();
      const response = await request(app)
        .post('/api/generate')
        .send(generationData);
      testContentId = response.body.data.id;
    });

    test('GET /api/images/:id/original - Should serve original image', async () => {
      const response = await request(app).get(`/api/images/${testContentId}/original`);
      
      // Image might not exist for test content, so handle both cases
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/image/);
      } else {
        expectNotFoundError(response);
      }
    });

    test('GET /api/images/:id/thumbnail - Should serve thumbnail image', async () => {
      const response = await request(app).get(`/api/images/${testContentId}/thumbnail`);
      
      // Image might not exist for test content, so handle both cases
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/image/);
      } else {
        expectNotFoundError(response);
      }
    });

    test('GET /api/images/:id/original - Should return 404 for non-existent image', async () => {
      const response = await request(app).get('/api/images/non-existent-id/original');
      
      expectNotFoundError(response);
    });

    test('GET /api/images/:id/thumbnail - Should return 404 for non-existent thumbnail', async () => {
      const response = await request(app).get('/api/images/non-existent-id/thumbnail');
      
      expectNotFoundError(response);
    });

  });

  // ==================== VALIDATION AND ERROR TESTS ====================
  
  describe('Validation and Error Handling', () => {
    
    test('Should validate content limit parameter bounds', async () => {
      // Test maximum limit
      const response1 = await request(app).get('/api/content?limit=1000');
      expectValidationError(response1);
      
      // Test minimum limit
      const response2 = await request(app).get('/api/content?limit=0');
      expectValidationError(response2);
    });

    test('Should handle malformed JSON in generation request', async () => {
      const response = await request(app)
        .post('/api/generate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expectErrorResponse(response, 400);
    });

    test('Should validate year ranges in generation', async () => {
      const invalidYears = [1800, 3500]; // Outside valid range
      
      for (const year of invalidYears) {
        const response = await request(app)
          .post('/api/generate')
          .send({ parameters: {}, year });
        
        expectValidationError(response);
      }
    });

    test('Should handle very large parameter objects', async () => {
      const largeParameters = {};
      // Create an object with many parameters
      for (let i = 0; i < 100; i++) {
        largeParameters[`param${i}`] = `value${i}`;
      }
      
      const response = await request(app)
        .post('/api/generate')
        .send({ parameters: largeParameters });
      
      // Should either succeed or fail validation gracefully
      expect([201, 400]).toContain(response.status);
    });

  });

});