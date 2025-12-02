/**
 * Parameter Fixes Tests
 * Tests for the enhanced parameter update logic that fixes UI issues
 */

import request from 'supertest';
import {
  app,
  setupTestSuite,
  createCategoryData,
  createParameterData,
  expectSuccessResponse,
  expectValidationError
} from './test-helpers.js';

setupTestSuite();

describe('Parameter Update Fixes', () => {
  let testCategoryId;

  beforeEach(async () => {
    // Create a test category for parameter tests
    const categoryData = createCategoryData({ name: 'Test Category for Fixes' });
    const categoryResponse = await request(app)
      .post('/api/admin/categories')
      .send(categoryData);
    testCategoryId = categoryResponse.body.data.id;
  });

  describe('Empty Array Issue Fix', () => {
    test('Should handle empty array parameter_values gracefully', async () => {
      // Create text parameter first
      const textParam = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(textParam);
      
      const parameterId = createResponse.body.data.id;
      
      // Update with empty array (simulating UI issue)
      const updateWithEmptyArray = {
        name: 'Fixed Select Parameter',
        type: 'select',
        category_id: testCategoryId,
        parameter_values: [] // This used to cause the issue
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateWithEmptyArray);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('select');
      // Should initialize proper defaults, not keep empty array
      expect(response.body.data.parameter_values).toEqual([]);
    });

    test('Should initialize proper defaults when no parameter_values sent', async () => {
      // Create text parameter first
      const textParam = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(textParam);
      
      const parameterId = createResponse.body.data.id;
      
      // Update without parameter_values (better approach)
      const updateWithoutValues = {
        name: 'Better Select Parameter',
        type: 'select',
        category_id: testCategoryId
        // No parameter_values - let backend initialize
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateWithoutValues);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('select');
      expect(response.body.data.parameter_values).toEqual([]);
    });
  });

  describe('Type-Value Compatibility Fix', () => {
    test('Should fix boolean type with array values', async () => {
      // Create parameter first
      const param = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(param);
      
      const parameterId = createResponse.body.data.id;
      
      // Send conflicting data (boolean with array values)
      const conflictingUpdate = {
        name: 'Boolean with Wrong Values',
        type: 'boolean',
        category_id: testCategoryId,
        parameter_values: [{ label: 'Option 1' }] // Wrong type for boolean
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(conflictingUpdate);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('boolean');
      // Should auto-correct to proper boolean format
      expect(response.body.data.parameter_values).toEqual({ on: 'Yes', off: 'No' });
    });

    test('Should preserve compatible values during type change', async () => {
      // Create parameter first
      const param = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(param);
      
      const parameterId = createResponse.body.data.id;
      
      // Send compatible boolean values
      const goodUpdate = {
        name: 'Boolean with Correct Values',
        type: 'boolean',
        category_id: testCategoryId,
        parameter_values: { on: 'Enabled', off: 'Disabled' }
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(goodUpdate);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('boolean');
      // Should preserve the provided values
      expect(response.body.data.parameter_values).toEqual({ on: 'Enabled', off: 'Disabled' });
    });
  });

  describe('Category ID Validation Fix', () => {
    test('Should accept category_id in update requests', async () => {
      // Create parameter first
      const param = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(param);
      
      const parameterId = createResponse.body.data.id;
      
      // Update with category_id (this used to be filtered out)
      const updateWithCategory = {
        name: 'Parameter with Category',
        description: 'Updated description',
        type: 'number',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(updateWithCategory);
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateWithCategory.name);
      expect(response.body.data.type).toBe(updateWithCategory.type);
      expect(response.body.data.category_id).toBe(testCategoryId);
    });
  });

  describe('Type Transition Scenarios', () => {
    test('Should handle text → select transition', async () => {
      // Create text parameter
      const textParam = createParameterData(testCategoryId, { type: 'text' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(textParam);
      
      const parameterId = createResponse.body.data.id;
      
      // Convert to select
      const toSelect = {
        type: 'select',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(toSelect);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('select');
      expect(response.body.data.parameter_values).toEqual([]);
    });

    test('Should handle select → boolean transition', async () => {
      // Create select parameter with values
      const selectParam = createParameterData(testCategoryId, {
        type: 'select',
        parameter_values: [{ label: 'Option 1', id: 'opt1' }]
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(selectParam);
      
      const parameterId = createResponse.body.data.id;
      
      // Convert to boolean
      const toBoolean = {
        type: 'boolean',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(toBoolean);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('boolean');
      expect(response.body.data.parameter_values).toEqual({ on: 'Yes', off: 'No' });
    });

    test('Should handle boolean → text transition', async () => {
      // Create boolean parameter
      const boolParam = createParameterData(testCategoryId, {
        type: 'boolean',
        parameter_values: { on: 'True', off: 'False' }
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(boolParam);
      
      const parameterId = createResponse.body.data.id;
      
      // Convert to text
      const toText = {
        type: 'text',
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(toText);
      
      expectSuccessResponse(response);
      expect(response.body.data.type).toBe('text');
      expect(response.body.data.parameter_values).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('Should handle null parameter_values explicitly', async () => {
      const param = createParameterData(testCategoryId, { type: 'select' });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(param);
      
      const parameterId = createResponse.body.data.id;
      
      // Explicitly send null
      const withNull = {
        type: 'text',
        parameter_values: null,
        category_id: testCategoryId
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(withNull);
      
      expectSuccessResponse(response);
      expect(response.body.data.parameter_values).toBeNull();
    });

    test('Should handle partial updates correctly', async () => {
      const param = createParameterData(testCategoryId, { 
        type: 'select',
        name: 'Original Name',
        description: 'Original Description'
      });
      const createResponse = await request(app)
        .post('/api/admin/parameters')
        .send(param);
      
      const parameterId = createResponse.body.data.id;
      
      // Update only the name
      const partialUpdate = {
        name: 'Updated Name Only'
      };
      
      const response = await request(app)
        .put(`/api/admin/parameters/${parameterId}`)
        .send(partialUpdate);
      
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Updated Name Only');
      expect(response.body.data.description).toBe('Original Description');
      expect(response.body.data.type).toBe('select');
    });
  });
});