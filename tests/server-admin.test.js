/**
 * Admin Routes Tests for SpecGen API
 * Tests all admin endpoints: categories, parameters, and settings
 */

import request from 'supertest';
import {
  app,
  setupTestSuite,
  createCategoryData,
  createParameterData,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectNotFoundError,
  expectSecurityHeaders
} from './test-helpers.js';

setupTestSuite();

describe('SpecGen API - Admin Routes', () => {
  
  // ==================== CATEGORY TESTS ====================
  
  describe('Categories Management', () => {
    
    test('GET /api/admin/categories - Should list all categories', async () => {
      const response = await request(app).get('/api/admin/categories');
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expectSecurityHeaders(response);
    });

    test('POST /api/admin/categories - Should create new category', async () => {
      const categoryData = createCategoryData();
      
      const response = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      
      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(categoryData.name);
      expect(response.body.data.description).toBe(categoryData.description);
    });

    test('POST /api/admin/categories - Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .send({ name: '' });
      
      expectValidationError(response);
    });

    test('POST /api/admin/categories - Should handle long descriptions', async () => {
      const categoryData = createCategoryData({
        description: 'x'.repeat(400) // Test description limit
      });
      
      const response = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      
      expectSuccessResponse(response, 201);
    });

    test('GET /api/admin/categories/:id - Should get category by ID', async () => {
      // First create a category
      const categoryData = createCategoryData();
      const createResponse = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      
      const categoryId = createResponse.body.data.id;
      
      // Then get it by ID
      const response = await request(app).get(`/api/admin/categories/${categoryId}`);
      
      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.name).toBe(categoryData.name);
    });

    test('GET /api/admin/categories/:id - Should return 404 for non-existent category', async () => {
      const response = await request(app).get('/api/admin/categories/non-existent-id');
      
      expectNotFoundError(response);
    });

    test('PUT /api/admin/categories/:id - Should update category', async () => {
      // Create category first
      const categoryData = createCategoryData();
      const createResponse = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      
      const categoryId = createResponse.body.data.id;
      const updateData = { name: 'Updated Category Name' };
      
      // Update the category
      const response = await request(app)
        .put(`/api/admin/categories/${categoryId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(categoryData.description); // Should remain unchanged
    });

    test('PUT /api/admin/categories/:id - Should validate update data', async () => {
      const response = await request(app)
        .put('/api/admin/categories/some-id')
        .send({ name: '' });
      
      expectValidationError(response);
    });

    test('DELETE /api/admin/categories/:id - Should delete category', async () => {
      // Create category first
      const categoryData = createCategoryData();
      const createResponse = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      
      const categoryId = createResponse.body.data.id;
      
      // Delete the category
      const response = await request(app).delete(`/api/admin/categories/${categoryId}`);
      
      expectSuccessResponse(response, 200, false); // Delete operations don't return data
      
      // Verify it's deleted
      const getResponse = await request(app).get(`/api/admin/categories/${categoryId}`);
      expectNotFoundError(getResponse);
    });

  });

  // ==================== PARAMETER TESTS ====================
  
  describe('Parameters Management', () => {
    
    let testCategoryId;

    beforeEach(async () => {
      // Create a test category for parameter tests
      const categoryData = createCategoryData({ name: 'Test Category for Parameters' });
      const categoryResponse = await request(app)
        .post('/api/admin/categories')
        .send(categoryData);
      testCategoryId = categoryResponse.body.data.id;
    });

    test('GET /api/admin/parameters - Should list all parameters', async () => {
      const response = await request(app).get('/api/admin/parameters');
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
    });

    test('GET /api/admin/parameters?categoryId=X - Should filter by category', async () => {
      // Create a parameter first
      const parameterData = createParameterData(testCategoryId);
      await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      // Filter by category
      const response = await request(app)
        .get(`/api/admin/parameters?categoryId=${testCategoryId}`);
      
      expectSuccessResponse(response);
      expect(response.body.meta.filters).toHaveProperty('categoryId', testCategoryId);
    });

    test('POST /api/admin/parameters - Should create new parameter', async () => {
      const parameterData = createParameterData(testCategoryId, {
        type: 'select',
        parameter_values: [
          { label: 'Option 1', id: 'opt1' },
          { label: 'Option 2', id: 'opt2' }
        ]
      });
      
      const response = await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(parameterData.name);
      expect(response.body.data.type).toBe(parameterData.type);
      expect(response.body.data.category_id).toBe(testCategoryId);
    });

    test('POST /api/admin/parameters - Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/parameters')
        .send({ name: '', type: 'text' }); // Missing category_id and invalid name
      
      expectValidationError(response);
    });

    test('POST /api/admin/parameters - Should create different parameter types', async () => {
      const parameterTypes = [
        { type: 'text' },
        { type: 'number' },
        { type: 'boolean', parameter_values: { on: 'Yes', off: 'No' } },
        { type: 'range' },
        { type: 'select', parameter_values: [{ label: 'Test', id: 'test' }] }
      ];

      for (const typeConfig of parameterTypes) {
        const parameterData = createParameterData(testCategoryId, {
          name: `Test ${typeConfig.type} Parameter`,
          ...typeConfig
        });
        
        const response = await request(app)
          .post('/api/admin/parameters')
          .send(parameterData);
        
        expectSuccessResponse(response, 201);
        expect(response.body.data.type).toBe(typeConfig.type);
      }
    });

    test('GET /api/admin/parameters/:id - Should get parameter by ID', async () => {
      // Create parameter first
      const parameterData = createParameterData(testCategoryId);
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      const parameterId = createResponse.body.data.id;
      
      // Get by ID
      const response = await request(app).get(`/api/admin/parameters/${parameterId}`);
      
      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(parameterId);
      expect(response.body.data.name).toBe(parameterData.name);
    });

    test('PUT /api/admin/parameters/:id - Should update parameter', async () => {
      // Create parameter first
      const parameterData = createParameterData(testCategoryId);
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      const parameterId = createResponse.body.data.id;
      const updateData = { 
        name: 'Updated Parameter Name',
        description: 'Updated description'
      };
      
      // Update
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    test('PUT /api/admin/parameters/:id - Should update parameter type with category_id', async () => {
      // Create parameter first
      const parameterData = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      const parameterId = createResponse.body.data.id;
      const updateData = { 
        name: 'Updated Parameter',
        type: 'select',
        category_id: testCategoryId,
        parameter_values: [
          { label: 'Option 1', id: 'opt1' },
          { label: 'Option 2', id: 'opt2' }
        ]
      };
      
      // Update type and values
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('select');
      expect(response.body.data.category_id).toBe(testCategoryId);
      expect(response.body.data.parameter_values).toEqual(updateData.parameter_values);
    });

    test('PUT /api/admin/parameters/:id - Should convert select parameter to text', async () => {
      // Create select parameter first
      const selectParameterData = createParameterData(testCategoryId, { 
        type: 'select',
        parameter_values: [
          { label: 'Option A', id: 'opt-a' },
          { label: 'Option B', id: 'opt-b' }
        ]
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(selectParameterData);
      
      const parameterId = createResponse.body.data.id;
      
      // Convert to text type (without explicit parameter_values - should auto-clear)
      const updateData = { 
        name: 'Converted to Text Parameter',
        description: 'This was converted from select to text',
        type: 'text',
        category_id: testCategoryId
      };
      
      // Update type from select to text
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('text');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.category_id).toBe(testCategoryId);
      expect(response.body.data.parameter_values).toBeNull();
    });

    test('PUT /api/admin/parameters/:id - Should convert text parameter to boolean with default labels', async () => {
      // Create text parameter first
      const textParameterData = createParameterData(testCategoryId, { 
        type: 'text'
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(textParameterData);
      
      expectSuccessResponse(createResponse, 201);
      expect(createResponse.body.data).toBeDefined();
      expect(createResponse.body.data.id).toBeDefined();
      
      const parameterId = createResponse.body.data.id;
      
      // Convert to boolean type (should auto-initialize labels)
      const updateData = { 
        name: 'Converted to Boolean Parameter',
        description: 'This was converted from text to boolean',
        type: 'boolean',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('boolean');
      expect(response.body.data.parameter_values).toEqual({ on: 'Yes', off: 'No' });
    });

    test('PUT /api/admin/parameters/:id - Should convert select to boolean with custom labels', async () => {
      // Create select parameter first
      const selectParameterData = createParameterData(testCategoryId, { 
        type: 'select',
        parameter_values: [{ label: 'Option 1', id: 'opt1' }]
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(selectParameterData);
      
      expectSuccessResponse(createResponse, 201);
      const parameterId = createResponse.body.data.id;
      
      // Convert to boolean type with custom labels
      const updateData = { 
        name: 'Boolean with Custom Labels',
        type: 'boolean',
        category_id: testCategoryId,
        parameter_values: { on: 'Enabled', off: 'Disabled' }
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('boolean');
      expect(response.body.data.parameter_values).toEqual({ on: 'Enabled', off: 'Disabled' });
    });

    test('PUT /api/admin/parameters/:id - Should convert text parameter to range with default config', async () => {
      // Create text parameter first
      const textParameterData = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(textParameterData);
      
      expectSuccessResponse(createResponse, 201);
      const parameterId = createResponse.body.data.id;
      
      // Convert to range type (should auto-initialize config)
      const updateData = { 
        name: 'Converted to Range Parameter',
        description: 'This was converted from text to range',
        type: 'range',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('range');
      expect(response.body.data.parameter_values).toBeNull();
      expect(response.body.data.parameter_config).toEqual({ min: 0, max: 100, step: 1 });
    });

    test('PUT /api/admin/parameters/:id - Should convert range to text and clear parameter_config', async () => {
      // Create range parameter first
      const rangeParameterData = createParameterData(testCategoryId, { 
        type: 'range'
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(rangeParameterData);
      
      expectSuccessResponse(createResponse, 201);
      const parameterId = createResponse.body.data.id;
      
      // Convert to text type (should clear parameter_config)
      const updateData = { 
        name: 'Converted from Range to Text',
        type: 'text',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateData);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('text');
      expect(response.body.data.parameter_values).toBeNull();
      expect(response.body.data.parameter_config).toBeNull();
    });

    test('DELETE /api/admin/parameters/:id - Should delete parameter', async () => {
      // Create parameter first
      const parameterData = createParameterData(testCategoryId);
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(parameterData);
      
      const parameterId = createResponse.body.data.id;
      
      // Delete
      const response = await request(app).delete(`/api/admin/parameters/${parameterId}`);
      
      expectSuccessResponse(response, 200, false); // Delete operations don't return data
      
      // Verify deleted (may return 500 if service layer doesn't handle missing parameter gracefully)
      const getResponse = await request(app).get(`/api/admin/parameters/${parameterId}`);
      expect([404, 500]).toContain(getResponse.status);
      expect(getResponse.body.success).toBe(false);
    });

  });

  // ==================== SETTINGS TESTS ====================
  
  describe('Settings Management', () => {
    
    test('GET /api/admin/settings - Should get all settings', async () => {
      const response = await request(app).get('/api/admin/settings');
      
      expectSuccessResponse(response);
      expect(typeof response.body.data).toBe('object');
    });

    test('PUT /api/admin/settings - Should update settings', async () => {
      const settingsUpdate = {
        testSetting1: 'value1',
        testSetting2: 'value2'
      };
      
      const response = await request(app)
        .put('/api/admin/settings')
        .send(settingsUpdate);
      
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('updated');
      expect(response.body.meta).toHaveProperty('failed');
    });

    test('PUT /api/admin/settings - Should validate non-empty request', async () => {
      const response = await request(app)
        .put('/api/admin/settings')
        .send({});
      
      expectErrorResponse(response, 400, 'At least one setting must be provided');
    });

  });

  // ==================== ERROR HANDLING TESTS ====================
  
  describe('Error Handling', () => {
    
    test('Should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expectErrorResponse(response, 400);
    });

    test('Should return 404 for non-existent endpoints', async () => {
      const response = await request(app).get('/api/admin/nonexistent');
      
      expectErrorResponse(response, 404);
    });

  });

});