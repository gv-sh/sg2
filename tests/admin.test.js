/**
 * Admin Tests for SpecGen
 * Tests admin endpoints for categories, parameters, and settings management
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

  // Create test categories
  await dataService.createCategory({
    id: 'science-fiction',
    name: 'Science Fiction',
    description: 'Stories set in the future with advanced technology',
    sort_order: 1
  });

  await dataService.createCategory({
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Stories with magic and mythical creatures',
    sort_order: 2
  });

  await dataService.createCategory({
    id: 'hidden-category',
    name: 'Hidden Category',
    description: 'This category should not appear in results',
    sort_order: 3
  });

  // Create test parameters
  await dataService.createParameter({
    id: 'sci-fi-tech-level',
    name: 'Technology Level',
    description: 'Level of technological advancement',
    type: 'select',
    category_id: 'science-fiction',
    sort_order: 1,
    parameter_values: [
      { id: 'near-future', label: 'Near Future' },
      { id: 'advanced', label: 'Advanced Technology' },
      { id: 'post-human', label: 'Post-Human' }
    ]
  });

  await dataService.createParameter({
    id: 'fantasy-magic-system',
    name: 'Magic System',
    description: 'Type of magical system',
    type: 'select',
    category_id: 'fantasy',
    sort_order: 1,
    parameter_values: [
      { id: 'elemental', label: 'Elemental Magic' },
      { id: 'divine', label: 'Divine Magic' },
      { id: 'arcane', label: 'Arcane Magic' }
    ]
  });

  await dataService.createParameter({
    id: 'story-length',
    name: 'Story Length',
    description: 'Length of the generated story',
    type: 'select',
    category_id: 'fantasy',
    sort_order: 2,
    parameter_values: [
      { id: 'short', label: 'Short (100-500 words)' },
      { id: 'medium', label: 'Medium (500-1000 words)' },
      { id: 'long', label: 'Long (1000+ words)' }
    ]
  });

  // Create test settings
  await dataService.setSetting('app_version', '2.0.0', 'string');
  await dataService.setSetting('max_generations_per_session', 50, 'number');
  await dataService.setSetting('enable_image_generation', true, 'boolean');
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

describe('SpecGen Admin - Categories', () => {
  test('GET /api/admin/categories - Should return all categories', async () => {
    const response = await request(app).get('/api/admin/categories');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(3);
    
    const categoryNames = response.body.data.map(c => c.name);
    expect(categoryNames).toContain('Science Fiction');
    expect(categoryNames).toContain('Fantasy');
    expect(categoryNames).toContain('Hidden Category');
  });

  test('GET /api/admin/categories/:id - Should return specific category', async () => {
    const response = await request(app).get('/api/admin/categories/science-fiction');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('science-fiction');
    expect(response.body.data.name).toBe('Science Fiction');
  });

  test('GET /api/admin/categories/:id - Should return 404 for non-existent category', async () => {
    const response = await request(app).get('/api/admin/categories/non-existent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });

  test('POST /api/admin/categories - Should create new category', async () => {
    const newCategory = {
      name: 'Cyberpunk',
      description: 'High tech, low life stories'
    };

    const response = await request(app)
      .post('/api/admin/categories')
      .send(newCategory);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Cyberpunk');
    expect(response.body.data.id).toBe('cyberpunk');
  });

  test('POST /api/admin/categories - Should validate required fields', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({ description: 'Missing name field' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });

  test('PUT /api/admin/categories/:id - Should update category', async () => {
    const updates = {
      description: 'Updated description for sci-fi'
    };

    const response = await request(app)
      .put('/api/admin/categories/science-fiction')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated description for sci-fi');
    expect(response.body.data.name).toBe('Science Fiction');
  });

  test('DELETE /api/admin/categories/:id - Should delete category', async () => {
    const response = await request(app).delete('/api/admin/categories/fantasy');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted successfully');

    const getResponse = await request(app).get('/api/admin/categories/fantasy');
    expect(getResponse.status).toBe(404);
  });
});

describe('SpecGen Admin - Parameters', () => {
  test('GET /api/admin/parameters - Should return all parameters', async () => {
    const response = await request(app).get('/api/admin/parameters');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    const param = response.body.data[0];
    expect(param).toHaveProperty('id');
    expect(param).toHaveProperty('name');
    expect(param).toHaveProperty('type');
    expect(param).toHaveProperty('category_id');
  });

  test('GET /api/admin/parameters?categoryId=science-fiction - Should filter by category', async () => {
    const response = await request(app)
      .get('/api/admin/parameters')
      .query({ categoryId: 'science-fiction' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    
    response.body.data.forEach(param => {
      expect(param.category_id).toBe('science-fiction');
    });
  });

  test('GET /api/admin/parameters/:id - Should return specific parameter', async () => {
    const response = await request(app).get('/api/admin/parameters/sci-fi-tech-level');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('sci-fi-tech-level');
    expect(response.body.data.name).toBe('Technology Level');
    expect(response.body.data.category_id).toBe('science-fiction');
    expect(Array.isArray(response.body.data.parameter_values)).toBe(true);
  });

  test('POST /api/admin/parameters - Should create new parameter', async () => {
    const newParameter = {
      name: 'Character Count',
      description: 'Number of main characters',
      type: 'select',
      category_id: 'fantasy',
      parameter_values: [
        { id: '1', label: '1 Character' },
        { id: '2', label: '2 Characters' },
        { id: '3', label: '3 Characters' }
      ]
    };

    const response = await request(app)
      .post('/api/admin/parameters')
      .send(newParameter);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Character Count');
    expect(response.body.data.type).toBe('select');
  });

  test('POST /api/admin/parameters - Should validate category exists', async () => {
    const invalidParameter = {
      name: 'Test Parameter',
      type: 'text',
      category_id: 'non-existent-category'
    };

    const response = await request(app)
      .post('/api/admin/parameters')
      .send(invalidParameter);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('PUT /api/admin/parameters/:id - Should update parameter', async () => {
    const updates = {
      name: 'Updated Technology Level',
      description: 'Updated description'
    };

    const response = await request(app)
      .put('/api/admin/parameters/sci-fi-tech-level')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Technology Level');
    expect(response.body.data.description).toBe('Updated description');
  });

  test('DELETE /api/admin/parameters/:id - Should delete parameter', async () => {
    const response = await request(app).delete('/api/admin/parameters/story-length');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const getResponse = await request(app).get('/api/admin/parameters/story-length');
    expect(getResponse.status).toBe(404);
  });
});

describe('SpecGen Admin - Settings', () => {
  test('GET /api/admin/settings - Should return all settings', async () => {
    const response = await request(app).get('/api/admin/settings');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data).toBe('object');
    expect(response.body.data.app_version).toBe('2.0.0');
    expect(response.body.data.max_generations_per_session).toBe(50);
    expect(response.body.data.enable_image_generation).toBe(true);
  });

  test('PUT /api/admin/settings - Should update settings', async () => {
    const updates = {
      max_generations_per_session: 20,
      enable_image_generation: false,
      new_setting: 'test value'
    };

    const response = await request(app)
      .put('/api/admin/settings')
      .send(updates);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.max_generations_per_session).toBe(20);
    expect(response.body.data.enable_image_generation).toBe(false);
    expect(response.body.data.new_setting).toBe('test value');
  });

  test('PUT /api/admin/settings - Should handle empty updates', async () => {
    const response = await request(app)
      .put('/api/admin/settings')
      .send({});
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('SpecGen Admin - Integration', () => {
  test('Should create category with parameters and retrieve them', async () => {
    // Create category
    const categoryResponse = await request(app)
      .post('/api/admin/categories')
      .send({
        name: 'Test Integration Category',
        description: 'Testing category-parameter relationship'
      });
    
    expect(categoryResponse.status).toBe(201);
    const categoryId = categoryResponse.body.data.id;

    // Create parameter for category
    const paramResponse = await request(app)
      .post('/api/admin/parameters')
      .send({
        name: 'Test Parameter',
        type: 'text',
        category_id: categoryId
      });
    
    expect(paramResponse.status).toBe(201);

    // Retrieve parameters for category
    const paramsResponse = await request(app)
      .get('/api/admin/parameters')
      .query({ categoryId });
    
    expect(paramsResponse.status).toBe(200);
    expect(paramsResponse.body.data).toHaveLength(1);
    expect(paramsResponse.body.data[0].category_id).toBe(categoryId);

    // Clean up
    await request(app).delete(`/api/admin/parameters/${paramResponse.body.data.id}`);
    await request(app).delete(`/api/admin/categories/${categoryId}`);
  });
});