/**
 * Integration tests for SpecGen API
 * Tests the complete flow of server endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE_URL });

// Test data
let testCategoryId;
let testParameterId;
let testContentId;

describe('SpecGen API Integration Tests', () => {

  beforeAll(async () => {
    // Wait for server to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await api.get('/api/system/health');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw new Error('Server not ready');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  describe('System Endpoints', () => {
    test('GET /api/system/health - should return healthy status', async () => {
      const response = await api.get('/api/system/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('GET /api/system/database/status - should return database status', async () => {
      const response = await api.get('/api/system/database/status');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('initialized');
    });

    test('GET / - should return API info', async () => {
      const response = await api.get('/');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('version');
    });
  });

  describe('Admin - Category Management', () => {
    test('POST /api/admin/categories - should create a new category', async () => {
      const newCategory = {
        name: 'Test Category',
        description: 'A test category for integration testing'
      };

      const response = await api.post('/api/admin/categories', newCategory);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(newCategory.name);

      testCategoryId = response.data.id;
    });

    test('GET /api/admin/categories - should retrieve all categories', async () => {
      const response = await api.get('/api/admin/categories');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test('GET /api/admin/categories/:id - should retrieve specific category', async () => {
      const response = await api.get(`/api/admin/categories/${testCategoryId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testCategoryId);
      expect(response.data.name).toBe('Test Category');
    });

    test('PUT /api/admin/categories/:id - should update category', async () => {
      const update = {
        name: 'Updated Test Category',
        description: 'Updated description'
      };

      const response = await api.put(`/api/admin/categories/${testCategoryId}`, update);
      expect(response.status).toBe(200);
      expect(response.data.name).toBe(update.name);
      expect(response.data.description).toBe(update.description);
    });
  });

  describe('Admin - Parameter Management', () => {
    test('POST /api/admin/parameters - should create a new parameter', async () => {
      const newParameter = {
        name: 'Test Parameter',
        description: 'A test parameter',
        type: 'select',
        category_id: testCategoryId,
        parameter_values: [
          { label: 'Option 1' },
          { label: 'Option 2' },
          { label: 'Option 3' }
        ]
      };

      const response = await api.post('/api/admin/parameters', newParameter);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(newParameter.name);

      testParameterId = response.data.id;
    });

    test('GET /api/admin/parameters - should retrieve all parameters', async () => {
      const response = await api.get('/api/admin/parameters');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/admin/parameters?categoryId=:id - should filter by category', async () => {
      const response = await api.get(`/api/admin/parameters?categoryId=${testCategoryId}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // All returned parameters should belong to the test category
      response.data.forEach(param => {
        expect(param.category_id).toBe(testCategoryId);
      });
    });

    test('GET /api/admin/parameters/:id - should retrieve specific parameter', async () => {
      const response = await api.get(`/api/admin/parameters/${testParameterId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testParameterId);
    });

    test('PUT /api/admin/parameters/:id - should update parameter', async () => {
      const update = {
        name: 'Updated Test Parameter',
        description: 'Updated parameter description'
      };

      const response = await api.put(`/api/admin/parameters/${testParameterId}`, update);
      expect(response.status).toBe(200);
      expect(response.data.name).toBe(update.name);
    });
  });

  describe('Admin - Settings Management', () => {
    test('GET /api/admin/settings - should retrieve settings', async () => {
      const response = await api.get('/api/admin/settings');
      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('object');
    });

    test('PUT /api/admin/settings - should update settings', async () => {
      const newSettings = {
        test_setting: 'test_value',
        another_setting: 123
      };

      const response = await api.put('/api/admin/settings', newSettings);
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject(newSettings);
    });
  });

  describe('Content Generation and Retrieval', () => {
    test('POST /api/generate - should generate content (may fail without API key)', async () => {
      const generateRequest = {
        parameters: {},
        year: 2024
      };

      try {
        const response = await api.post('/api/generate', generateRequest);

        if (response.status === 200 || response.status === 201) {
          expect(response.data).toHaveProperty('id');
          testContentId = response.data.id;
        }
      } catch (error) {
        // Expected to fail if no OpenAI API key is configured
        if (error.response?.status === 500) {
          console.log('Content generation failed (likely missing API key) - this is expected in test environment');
        } else {
          throw error;
        }
      }
    });

    test('GET /api/content - should retrieve content list', async () => {
      const response = await api.get('/api/content');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/content/summary - should retrieve content summary', async () => {
      const response = await api.get('/api/content/summary');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('total');
      expect(typeof response.data.total).toBe('number');
    });

    test('GET /api/content/:id - should retrieve specific content (if exists)', async () => {
      if (testContentId) {
        const response = await api.get(`/api/content/${testContentId}`);
        expect(response.status).toBe(200);
        expect(response.data.id).toBe(testContentId);
      }
    });
  });

  describe('Error Handling', () => {
    test('GET /api/admin/categories/:id - should return 404 for non-existent category', async () => {
      try {
        await api.get('/api/admin/categories/non-existent-id');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    test('POST /api/admin/categories - should validate required fields', async () => {
      try {
        await api.post('/api/admin/categories', { description: 'Missing name' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('PUT /api/admin/categories/:id - should reject empty updates', async () => {
      try {
        await api.put(`/api/admin/categories/${testCategoryId}`, {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Cleanup', () => {
    test('DELETE /api/admin/parameters/:id - should delete parameter', async () => {
      if (testParameterId) {
        const response = await api.delete(`/api/admin/parameters/${testParameterId}`);
        expect(response.status).toBe(204);
      }
    });

    test('DELETE /api/admin/categories/:id - should delete category', async () => {
      if (testCategoryId) {
        const response = await api.delete(`/api/admin/categories/${testCategoryId}`);
        expect(response.status).toBe(204);
      }
    });

    test('DELETE /api/content/:id - should delete content (if exists)', async () => {
      if (testContentId) {
        try {
          const response = await api.delete(`/api/content/${testContentId}`);
          expect(response.status).toBe(204);
        } catch (error) {
          // May not exist if generation failed
          console.log('Content deletion skipped (content may not exist)');
        }
      }
    });
  });
});
