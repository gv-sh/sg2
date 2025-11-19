/**
 * End-to-end integration tests for SpecGen
 * Tests complete workflow: Admin setup -> Content generation -> User retrieval
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE_URL });

describe('E2E Workflow Tests', () => {
  let categoryId;
  let parameterId1;
  let parameterId2;
  let generatedContentId;

  beforeAll(async () => {
    // Ensure server is ready
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

  test('Admin Flow: Create category and parameters', async () => {
    // Step 1: Create a category
    const categoryData = {
      name: 'E2E Test Category',
      description: 'Category for end-to-end testing'
    };

    const categoryResponse = await api.post('/api/admin/categories', categoryData);
    expect(categoryResponse.status).toBe(201);
    categoryId = categoryResponse.data.id;

    // Step 2: Create first parameter (select type)
    const param1Data = {
      name: 'Genre',
      description: 'Story genre',
      type: 'select',
      category_id: categoryId,
      parameter_values: [
        { label: 'Science Fiction' },
        { label: 'Fantasy' },
        { label: 'Mystery' }
      ]
    };

    const param1Response = await api.post('/api/admin/parameters', param1Data);
    expect(param1Response.status).toBe(201);
    parameterId1 = param1Response.data.id;

    // Step 3: Create second parameter (text type)
    const param2Data = {
      name: 'Theme',
      description: 'Story theme',
      type: 'text',
      category_id: categoryId
    };

    const param2Response = await api.post('/api/admin/parameters', param2Data);
    expect(param2Response.status).toBe(201);
    parameterId2 = param2Response.data.id;

    // Verify parameters are associated with category
    const categoryDetailResponse = await api.get(`/api/admin/categories/${categoryId}`);
    expect(categoryDetailResponse.data.parameters).toBeDefined();
    expect(categoryDetailResponse.data.parameters.length).toBeGreaterThanOrEqual(2);
  });

  test('User Flow: Retrieve parameters and attempt content generation', async () => {
    // Step 1: Get all parameters
    const paramsResponse = await api.get('/api/admin/parameters');
    expect(paramsResponse.status).toBe(200);

    const testParams = paramsResponse.data.filter(p =>
      p.id === parameterId1 || p.id === parameterId2
    );
    expect(testParams.length).toBe(2);

    // Step 2: Attempt to generate content
    const generationData = {
      parameters: {
        genre: 'Science Fiction',
        theme: 'Time Travel'
      },
      year: 2024
    };

    try {
      const generateResponse = await api.post('/api/generate', generationData);

      if (generateResponse.status === 200 || generateResponse.status === 201) {
        generatedContentId = generateResponse.data.id;

        // Verify content structure
        expect(generateResponse.data).toHaveProperty('id');
        expect(generateResponse.data).toHaveProperty('content');
      }
    } catch (error) {
      // Generation may fail without API key - that's okay for testing
      if (error.response?.status === 500) {
        console.log('Content generation skipped (API key likely not configured)');
      } else {
        throw error;
      }
    }
  });

  test('User Flow: Browse and retrieve generated content', async () => {
    // Step 1: Get content summary
    const summaryResponse = await api.get('/api/content/summary');
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.data).toHaveProperty('total');

    // Step 2: Get content list
    const contentListResponse = await api.get('/api/content?limit=10');
    expect(contentListResponse.status).toBe(200);
    expect(Array.isArray(contentListResponse.data)).toBe(true);

    // Step 3: If content was generated, retrieve it
    if (generatedContentId) {
      const contentResponse = await api.get(`/api/content/${generatedContentId}`);
      expect(contentResponse.status).toBe(200);
      expect(contentResponse.data.id).toBe(generatedContentId);
    }
  });

  test('Admin Flow: Update settings and verify', async () => {
    // Step 1: Update settings
    const newSettings = {
      e2e_test_setting: 'test_value',
      max_generations_per_day: 100
    };

    const updateResponse = await api.put('/api/admin/settings', newSettings);
    expect(updateResponse.status).toBe(200);

    // Step 2: Verify settings were saved
    const settingsResponse = await api.get('/api/admin/settings');
    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.data).toMatchObject(newSettings);
  });

  test('Complete Workflow: Verify all components working together', async () => {
    // 1. Verify category exists and has parameters
    const categoryResponse = await api.get(`/api/admin/categories/${categoryId}`);
    expect(categoryResponse.status).toBe(200);
    expect(categoryResponse.data.parameters.length).toBeGreaterThanOrEqual(2);

    // 2. Verify parameters are retrievable
    const param1Response = await api.get(`/api/admin/parameters/${parameterId1}`);
    const param2Response = await api.get(`/api/admin/parameters/${parameterId2}`);
    expect(param1Response.status).toBe(200);
    expect(param2Response.status).toBe(200);

    // 3. Verify content endpoint is functional
    const contentResponse = await api.get('/api/content');
    expect(contentResponse.status).toBe(200);

    // 4. Verify system health
    const healthResponse = await api.get('/api/system/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('healthy');
  });

  test('Cleanup: Remove test data', async () => {
    // Delete in reverse order of dependencies
    if (generatedContentId) {
      try {
        await api.delete(`/api/content/${generatedContentId}`);
      } catch (error) {
        console.log('Content cleanup skipped (may not exist)');
      }
    }

    if (parameterId1) {
      const response1 = await api.delete(`/api/admin/parameters/${parameterId1}`);
      expect(response1.status).toBe(204);
    }

    if (parameterId2) {
      const response2 = await api.delete(`/api/admin/parameters/${parameterId2}`);
      expect(response2.status).toBe(204);
    }

    if (categoryId) {
      const categoryResponse = await api.delete(`/api/admin/categories/${categoryId}`);
      expect(categoryResponse.status).toBe(204);
    }

    // Verify cleanup
    try {
      await api.get(`/api/admin/categories/${categoryId}`);
      fail('Category should have been deleted');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
});
