/**
 * User/Content Tests for SpecGen
 * Tests content generation, retrieval, and user-facing endpoints
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';

import app from '../src/server/server.js';
import { dataService } from '../src/server/services.js';
import config from '../src/server/config.js';

global.jest = jest;

const TEST_DB_PATH = config.getDatabasePath();

async function initTestDatabase() {
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (err) {
    // File might not exist, that's ok
  }

  await dataService.init();

  // Create test category for content generation
  await dataService.createCategory({
    id: 'test-category',
    name: 'Test Category',
    description: 'Category for testing content generation',
    sort_order: 1
  });

  // Create test parameters
  await dataService.createParameter({
    id: 'test-param-1',
    name: 'Test Parameter 1',
    description: 'First test parameter',
    type: 'select',
    category_id: 'test-category',
    sort_order: 1,
    parameter_values: [
      { id: 'option1', label: 'Option 1' },
      { id: 'option2', label: 'Option 2' }
    ]
  });

  await dataService.createParameter({
    id: 'test-param-2',
    name: 'Test Parameter 2',
    description: 'Second test parameter',
    type: 'text',
    category_id: 'test-category',
    sort_order: 2
  });
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

describe('SpecGen User - Content Generation', () => {
  test('POST /api/generate - Should handle generation request with validation error', async () => {
    // Test without OpenAI key configured - should fail
    const response = await request(app)
      .post('/api/generate')
      .send({
        parameters: { category: 'test-category' },
        year: 2150
      });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Internal Server Error');
  });

  test('POST /api/generate - Should validate generation request schema', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({
        parameters: 'not-an-object'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/generate - Should default parameters field when missing', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({
        year: 2024
      });
    
    // Should fail with 500 due to missing OpenAI configuration, not validation error
    // The schema defaults parameters to {} when not provided
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Internal Server Error');
  });

  test('POST /api/generate - Should handle empty parameters', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({
        parameters: {},
        year: 2024
      });
    
    // This might succeed or fail depending on OpenAI key configuration
    expect([400, 500]).toContain(response.status);
  });
});

describe('SpecGen User - Content Retrieval', () => {
  test('GET /api/content - Should return empty content list initially', async () => {
    const response = await request(app).get('/api/content');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });

  test('GET /api/content - Should support pagination parameters', async () => {
    const response = await request(app)
      .get('/api/content')
      .query({ limit: 10, offset: 0 });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/content/summary - Should return content summary', async () => {
    const response = await request(app).get('/api/content/summary');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/content/years - Should return available years', async () => {
    const response = await request(app).get('/api/content/years');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app).get('/api/content/non-existent-id');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/content - Should filter by search query', async () => {
    const response = await request(app)
      .get('/api/content')
      .query({ search: 'test' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/content - Should filter by year', async () => {
    const response = await request(app)
      .get('/api/content')
      .query({ year: 2024 });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('SpecGen User - Content Management', () => {
  test('PUT /api/content/:id - Should update content title', async () => {
    // First create some content
    const contentData = {
      title: 'Original Title',
      fiction_content: 'Test story content',
      prompt_data: { test: 'data' },
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Update the title
    const response = await request(app)
      .put(`/api/content/${savedContent.id}`)
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Title');
  });

  test('PUT /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app)
      .put('/api/content/non-existent-id')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('PUT /api/content/:id - Should validate title field', async () => {
    // Create content
    const contentData = {
      title: 'Test Title',
      fiction_content: 'Test content',
      prompt_data: {},
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Try to update with empty title
    const response = await request(app)
      .put(`/api/content/${savedContent.id}`)
      .send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('DELETE /api/content/:id - Should delete content', async () => {
    // First create some content
    const contentData = {
      title: 'Test Title',
      fiction_content: 'Test story content',
      prompt_data: { test: 'data' },
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Delete it
    const response = await request(app).delete(`/api/content/${savedContent.id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted successfully');

    // Verify it's gone
    const getResponse = await request(app).get(`/api/content/${savedContent.id}`);
    expect(getResponse.status).toBe(404);
  });

  test('DELETE /api/content/:id - Should return 404 for non-existent content', async () => {
    const response = await request(app).delete('/api/content/non-existent-id');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('SpecGen User - Image Endpoints', () => {
  test('GET /api/images/:id/original - Should return 404 for non-existent image', async () => {
    const response = await request(app).get('/api/images/non-existent-id/original');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('GET /api/images/:id/thumbnail - Should return 404 for non-existent image', async () => {
    const response = await request(app).get('/api/images/non-existent-id/thumbnail');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('GET /api/content/:id/image - Should return 404 for content without image', async () => {
    // Create content without image
    const contentData = {
      title: 'Test Content',
      fiction_content: 'Test story',
      prompt_data: {},
      metadata: {}
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    const response = await request(app).get(`/api/content/${savedContent.id}/image`);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('SpecGen User - Content Workflow', () => {
  test('Should handle complete content workflow', async () => {
    // Step 1: Check initial content list is empty
    const listResponse1 = await request(app).get('/api/content');
    expect(listResponse1.status).toBe(200);
    expect(listResponse1.body.data).toHaveLength(0);

    // Step 2: Create content directly (since generation requires API key)
    const contentData = {
      title: 'Workflow Test Content',
      fiction_content: 'This is a test story for workflow testing.',
      prompt_data: {
        category: 'test-category',
        parameters: { test: 'value' }
      },
      metadata: {
        year: 2024
      }
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Step 3: Retrieve content list
    const listResponse2 = await request(app).get('/api/content');
    expect(listResponse2.status).toBe(200);
    expect(listResponse2.body.data).toHaveLength(1);
    expect(listResponse2.body.data[0].id).toBe(savedContent.id);

    // Step 4: Get specific content
    const getResponse = await request(app).get(`/api/content/${savedContent.id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.title).toBe('Workflow Test Content');

    // Step 5: Update content title
    const updateResponse = await request(app)
      .put(`/api/content/${savedContent.id}`)
      .send({ title: 'Updated Workflow Content' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe('Updated Workflow Content');

    // Step 6: Delete content
    const deleteResponse = await request(app).delete(`/api/content/${savedContent.id}`);
    expect(deleteResponse.status).toBe(200);

    // Step 7: Verify deletion
    const listResponse3 = await request(app).get('/api/content');
    expect(listResponse3.status).toBe(200);
    expect(listResponse3.body.data).toHaveLength(0);
  });

  test('Should handle content with metadata correctly', async () => {
    // Create content with rich metadata
    const contentData = {
      title: 'Rich Content',
      fiction_content: 'Story with metadata',
      prompt_data: {
        category: 'test-category',
        parameters: {
          param1: 'value1',
          param2: 'value2'
        }
      },
      metadata: {
        year: 2024,
        genre: 'science-fiction',
        tags: ['future', 'technology']
      }
    };
    const savedContent = await dataService.saveGeneratedContent(contentData);

    // Retrieve and verify metadata
    const response = await request(app).get(`/api/content/${savedContent.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.metadata).toMatchObject({
      year: 2024,
      genre: 'science-fiction',
      tags: ['future', 'technology']
    });
  });
});