/**
 * Admin Routes - Category, Parameter, and Settings management
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';

import { dataService } from '../services.js';
import InstagramService from '../services/instagram.js';
import { getImageGenerator } from '../services/productionImageGenerator.js';
import config from '../config.js';
import {
  categorySchema,
  categoryUpdateSchema,
  parameterSchema,
  parameterUpdateSchema,
  parameterFiltersSchema,
  idParamSchema
} from '../middleware.js';
import type {
  TypedRequestParams,
  TypedRequestBody,
  TypedRequestQuery,
  TypedRequest,
  ApiResponse
} from '../../types/api.js';

const router: express.Router = express.Router();

// Initialize services
const imageGenerator = getImageGenerator();

// Type definitions
type CategorySchema = z.infer<typeof categorySchema>;
type CategoryUpdateSchema = z.infer<typeof categoryUpdateSchema>;
type ParameterSchema = z.infer<typeof parameterSchema>;
type ParameterUpdateSchema = z.infer<typeof parameterUpdateSchema>;
type ParameterFiltersSchema = z.infer<typeof parameterFiltersSchema>;
type IdParamSchema = z.infer<typeof idParamSchema>;

// ==================== CATEGORY ROUTES ====================

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Categories retrieved successfully"
 *               data:
 *                 - id: "character-development"
 *                   name: "Character Development"
 *                   description: "Parameters for character-related story generation"
 *                   created_at: "2025-12-01T10:30:00.000Z"
 *                 - id: "story-settings"
 *                   name: "Story Settings"
 *                   description: "General story configuration and structure"
 *                   created_at: "2025-12-01T10:31:00.000Z"
 *               meta:
 *                 total: 2
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 */
router.get('/categories', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  // Cache headers for categories list
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  try {
    const categories = await dataService.getCategories();
    
    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
      meta: {
        total: categories.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve categories', error));
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "character-development"
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Category retrieved successfully"
 *               data:
 *                 id: "character-development"
 *                 name: "Character Development"
 *                 description: "Parameters for character-related story generation"
 *                 created_at: "2025-12-01T10:30:00.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Category with id unknown-category not found"
 */
router.get('/categories/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const category = await dataService.getCategoryById(id);
    
    res.json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *           example:
 *             name: "Writing Style"
 *             description: "Parameters for controlling narrative voice and style"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Category created successfully"
 *               data:
 *                 id: "writing-style"
 *                 name: "Writing Style"
 *                 description: "Parameters for controlling narrative voice and style"
 *                 created_at: "2025-12-01T15:45:30.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       409:
 *         description: Category with this name already exists
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "A category with this name already exists"
 */
router.post('/categories', async (req: TypedRequestBody<CategorySchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    const category = await dataService.createCategory(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const boomError = boom.badRequest('Validation failed');
      boomError.output.payload.details = error.errors;
      return next(boomError);
    }
    
    // Handle SQLite constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('UNIQUE constraint failed: categories.name')) {
      return next(boom.conflict('A category with this name already exists'));
    }
    
    next(boom.internal('Failed to create category', error));
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "character-development"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *           example:
 *             description: "Enhanced parameters for detailed character creation and development"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Category updated successfully"
 *               data:
 *                 id: "character-development"
 *                 name: "Character Development"
 *                 description: "Enhanced parameters for detailed character creation and development"
 *                 created_at: "2025-12-01T10:30:00.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Category with id unknown-category not found"
 *       409:
 *         description: Category name already exists
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "A category with this name already exists"
 */
router.put('/categories/:id', async (req: TypedRequest<IdParamSchema, CategoryUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = categoryUpdateSchema.parse(req.body);
    const category = await dataService.updateCategory(id, validatedData);
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle SQLite constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('UNIQUE constraint failed: categories.name')) {
      return next(boom.conflict('A category with this name already exists'));
    }
    
    next(boom.internal('Failed to update category', error));
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "writing-style"
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Category deleted successfully"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Category with id unknown-category not found"
 */
router.delete('/categories/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    await dataService.deleteCategory(id);
    
    res.json({
      success: true,
      message: 'Category deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(error);
  }
});

// ==================== PARAMETER ROUTES ====================

/**
 * @swagger
 * /api/admin/parameters:
 *   get:
 *     summary: Get parameters with optional filtering
 *     tags: [Admin]
 *     parameters:
 *       - name: category_id
 *         in: query
 *         schema:
 *           type: string
 *         example: "character-development"
 *     responses:
 *       200:
 *         description: List of parameters
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Parameters retrieved successfully"
 *               data:
 *                 - id: "character-age"
 *                   name: "Character Age"
 *                   description: "The age range of the main character"
 *                   type: "select"
 *                   category_id: "character-development"
 *                   parameter_values:
 *                     - label: "Child (5-12)"
 *                       id: "child"
 *                     - label: "Teenager (13-19)"
 *                       id: "teenager"
 *                     - label: "Young Adult (20-35)"
 *                       id: "young-adult"
 *                     - label: "Middle Aged (36-55)"
 *                       id: "middle-aged"
 *                   created_at: "2025-12-01T10:32:00.000Z"
 *                 - id: "story-length"
 *                   name: "Story Length"
 *                   description: "Target word count for the story"
 *                   type: "range"
 *                   category_id: "story-settings"
 *                   created_at: "2025-12-01T10:33:00.000Z"
 *               meta:
 *                 total: 2
 *                 filters:
 *                   categoryId: "character-development"
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 */
router.get('/parameters', async (req: TypedRequestQuery<ParameterFiltersSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  // Cache headers for parameters list
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  try {
    const filters = parameterFiltersSchema.parse(req.query);
    const parameters = filters.categoryId ? 
      await dataService.getParametersByCategory(filters.categoryId) : 
      await dataService.getParameters();
    
    res.json({
      success: true,
      message: 'Parameters retrieved successfully',
      data: parameters,
      meta: {
        total: parameters.length,
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve parameters', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   get:
 *     summary: Get parameter by ID
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "character-age"
 *     responses:
 *       200:
 *         description: Parameter details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Parameter retrieved successfully"
 *               data:
 *                 id: "character-age"
 *                 name: "Character Age"
 *                 description: "The age range of the main character"
 *                 type: "select"
 *                 category_id: "character-development"
 *                 parameter_values:
 *                   - label: "Child (5-12)"
 *                     id: "child"
 *                   - label: "Teenager (13-19)"
 *                     id: "teenager"
 *                   - label: "Young Adult (20-35)"
 *                     id: "young-adult"
 *                 created_at: "2025-12-01T10:32:00.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Parameter not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Parameter with id unknown-parameter not found"
 */
router.get('/parameters/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parameter = await dataService.getParameterById(id);
    
    res.json({
      success: true,
      message: 'Parameter retrieved successfully',
      data: parameter,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve parameter', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters:
 *   post:
 *     summary: Create new parameter
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, category_id]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [select, text, number, boolean, range]
 *               category_id:
 *                 type: string
 *               parameter_values:
 *                 oneOf:
 *                   - type: array
 *                   - type: object
 *           examples:
 *             select_parameter:
 *               summary: "Select parameter with options"
 *               value:
 *                 name: "Genre"
 *                 description: "The literary genre for the story"
 *                 type: "select"
 *                 category_id: "story-settings"
 *                 parameter_values:
 *                   - label: "Fantasy"
 *                     id: "fantasy"
 *                   - label: "Science Fiction"
 *                     id: "sci-fi"
 *                   - label: "Mystery"
 *                     id: "mystery"
 *             boolean_parameter:
 *               summary: "Boolean parameter with on/off labels"
 *               value:
 *                 name: "Include Dialogue"
 *                 description: "Whether to include character dialogue"
 *                 type: "boolean"
 *                 category_id: "writing-style"
 *                 parameter_values:
 *                   on: "Yes"
 *                   off: "No"
 *             range_parameter:
 *               summary: "Range parameter"
 *               value:
 *                 name: "Word Count"
 *                 description: "Target number of words for the story"
 *                 type: "range"
 *                 category_id: "story-settings"
 *     responses:
 *       201:
 *         description: Parameter created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Parameter created successfully"
 *               data:
 *                 id: "genre"
 *                 name: "Genre"
 *                 description: "The literary genre for the story"
 *                 type: "select"
 *                 category_id: "story-settings"
 *                 parameter_values:
 *                   - label: "Fantasy"
 *                     id: "fantasy"
 *                   - label: "Science Fiction"
 *                     id: "sci-fi"
 *                   - label: "Mystery"
 *                     id: "mystery"
 *                 created_at: "2025-12-01T15:45:30.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       400:
 *         description: Invalid category ID or validation error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Invalid category ID - category does not exist"
 */
router.post('/parameters', async (req: TypedRequestBody<ParameterSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = parameterSchema.parse(req.body);
    const parameter = await dataService.createParameter(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'Parameter created successfully',
      data: parameter,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle SQLite constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('FOREIGN KEY constraint failed')) {
      return next(boom.badRequest('Invalid category ID - category does not exist'));
    }
    
    next(boom.internal('Failed to create parameter', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   put:
 *     summary: Update parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "genre"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [select, text, number, boolean, range]
 *               parameter_values:
 *                 oneOf:
 *                   - type: array
 *                   - type: object
 *           example:
 *             description: "The primary literary genre and subgenre for the story"
 *             parameter_values:
 *               - label: "Fantasy - Epic"
 *                 id: "fantasy-epic"
 *               - label: "Fantasy - Urban"
 *                 id: "fantasy-urban"
 *               - label: "Science Fiction - Space Opera"
 *                 id: "sci-fi-space"
 *               - label: "Mystery - Cozy"
 *                 id: "mystery-cozy"
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Parameter updated successfully"
 *               data:
 *                 id: "genre"
 *                 name: "Genre"
 *                 description: "The primary literary genre and subgenre for the story"
 *                 type: "select"
 *                 category_id: "story-settings"
 *                 parameter_values:
 *                   - label: "Fantasy - Epic"
 *                     id: "fantasy-epic"
 *                   - label: "Fantasy - Urban"
 *                     id: "fantasy-urban"
 *                   - label: "Science Fiction - Space Opera"
 *                     id: "sci-fi-space"
 *                   - label: "Mystery - Cozy"
 *                     id: "mystery-cozy"
 *                 created_at: "2025-12-01T10:33:00.000Z"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Parameter not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Parameter with id unknown-parameter not found"
 */
router.put('/parameters/:id', async (req: TypedRequest<IdParamSchema, ParameterUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    console.log('Parameter update request:', { 
      id, 
      body: req.body
    });
    
    // Validate the entire request body (now includes category_id)
    const validatedData = parameterUpdateSchema.parse(req.body);
    
    console.log('Parameter update validated:', { validatedData });
    
    const parameter = await dataService.updateParameter(id, validatedData);
    
    res.json({
      success: true,
      message: 'Parameter updated successfully',
      data: parameter,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle SQLite constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('FOREIGN KEY constraint failed')) {
      return next(boom.badRequest('Invalid category ID - category does not exist'));
    }
    
    next(boom.internal('Failed to update parameter', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   delete:
 *     summary: Delete parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "genre"
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Parameter deleted successfully"
 *               meta:
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 *       404:
 *         description: Parameter not found
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Parameter with id unknown-parameter not found"
 */
router.delete('/parameters/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    await dataService.deleteParameter(id);
    
    res.json({
      success: true,
      message: 'Parameter deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to delete parameter', error));
  }
});

// ==================== SETTINGS ROUTES ====================

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Application settings
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Settings retrieved successfully"
 *               data:
 *                 app_version: "2.0.0"
 *                 max_content_length: 10000
 *                 max_generations_per_session: 50
 *                 enable_image_generation: true
 *                 default_fiction_length: "medium"
 *                 rate_limit_per_minute: 10
 *                 maintenance_mode: false
 */
router.get('/settings', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const settings = await dataService.getSettings();
    res.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve settings', error));
  }
});

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update application settings
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             max_content_length: 15000
 *             enable_image_generation: false
 *             rate_limit_per_minute: 20
 *             default_fiction_length: "long"
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Settings updated successfully"
 *               data:
 *                 - key: "max_content_length"
 *                   value: "15000"
 *                   updated: true
 *                 - key: "enable_image_generation"
 *                   value: "false"
 *                   updated: true
 *                 - key: "rate_limit_per_minute"
 *                   value: "20"
 *                   updated: true
 *                 - key: "default_fiction_length"
 *                   value: "long"
 *                   updated: true
 *               meta:
 *                 updated: 4
 *                 failed: 0
 *                 timestamp: "2025-12-01T15:45:30.000Z"
 */
router.put('/settings', async (req: TypedRequestBody<Record<string, any>>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const updates = req.body;
    
    // Validate that we have at least one setting to update
    if (!updates || Object.keys(updates).length === 0) {
      return next(boom.badRequest('At least one setting must be provided'));
    }
    
    const results = [];
    
    for (const [key, value] of Object.entries(updates)) {
      try {
        // Auto-detect data type for proper storage and retrieval
        let dataType: 'string' | 'number' | 'boolean' | 'json' = 'string';
        if (typeof value === 'number') {
          dataType = 'number';
        } else if (typeof value === 'boolean') {
          dataType = 'boolean';
        } else if (typeof value === 'object' && value !== null) {
          dataType = 'json';
        }
        
        const setting = await dataService.setSetting(key, value, dataType);
        results.push(setting);
      } catch (error: any) {
        console.warn(`Failed to update setting ${key}:`, error.message);
        results.push({ key, value, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: results,
      meta: {
        updated: results.filter(r => !('error' in r)).length,
        failed: results.filter(r => 'error' in r).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to update settings', error));
  }
});

// ==================== MODEL CONFIGURATION ROUTES ====================

/**
 * @swagger
 * /api/admin/models:
 *   get:
 *     summary: Get available AI models and their specifications
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Available models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     fiction:
 *                       type: array
 *                     image:
 *                       type: array
 */
router.get('/models', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const availableModels = config.getAvailableModels();
    
    res.json({
      success: true,
      message: 'Available models retrieved successfully',
      data: availableModels,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve available models', error));
  }
});

// ==================== INSTAGRAM PREVIEW ROUTES ====================

/**
 * @swagger
 * /api/admin/instagram/preview:
 *   post:
 *     summary: Generate Instagram carousel preview for admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storyId]
 *             properties:
 *               storyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Instagram preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     slides:
 *                       type: array
 *                     caption:
 *                       type: string
 *                     slideCount:
 *                       type: number
 *                     theme:
 *                       type: string
 */
router.post('/instagram/preview', async (req: TypedRequestBody<{ storyId: string }>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { storyId } = req.body;
    
    // Validate story ID
    if (!storyId || typeof storyId !== 'string') {
      return next(boom.badRequest('Valid story ID is required'));
    }
    
    // Get the story from database
    const story = await dataService.getGeneratedContentById(storyId);
    if (!story) {
      return next(boom.notFound(`Story with ID ${storyId} not found`));
    }
    
    // Load Instagram design settings from database
    const designSettings = await dataService.getSettings();
    
    // Extract design settings for Instagram using the same structure as Settings page
    const instagramDesignSettings = {
      typography: {
        font_family: designSettings['instagram.design.typography.font_family'] || 'Work Sans',
        title_size: designSettings['instagram.design.typography.title_size'] || 72,
        content_size: designSettings['instagram.design.typography.content_size'] || 42,
        year_size: designSettings['instagram.design.typography.year_size'] || 36,
        branding_title_size: designSettings['instagram.design.typography.branding_title_size'] || 36,
        branding_main_size: designSettings['instagram.design.typography.branding_main_size'] || 48,
        branding_subtitle_size: designSettings['instagram.design.typography.branding_subtitle_size'] || 28,
        title_weight: designSettings['instagram.design.typography.title_weight'] || 500,
        content_weight: designSettings['instagram.design.typography.content_weight'] || 400,
        letter_spacing_title: designSettings['instagram.design.typography.letter_spacing_title'] || -0.02,
        letter_spacing_year: designSettings['instagram.design.typography.letter_spacing_year'] || 0.02,
        line_height_title: designSettings['instagram.design.typography.line_height_title'] || 1.2,
        line_height_content: designSettings['instagram.design.typography.line_height_content'] || 1.6
      },
      colors: {
        primary_background: designSettings['instagram.design.colors.primary_background'] || '#f8f8f8',
        secondary_background: designSettings['instagram.design.colors.secondary_background'] || '#f0f0f0',
        content_background: designSettings['instagram.design.colors.content_background'] || '#fdfdfd',
        branding_background: designSettings['instagram.design.colors.branding_background'] || '#0a0a0a',
        branding_background_secondary: designSettings['instagram.design.colors.branding_background_secondary'] || '#1a1a1a',
        primary_text: designSettings['instagram.design.colors.primary_text'] || '#0a0a0a',
        content_text: designSettings['instagram.design.colors.content_text'] || '#1a1a1a',
        year_text: designSettings['instagram.design.colors.year_text'] || '#666666',
        branding_text_primary: designSettings['instagram.design.colors.branding_text_primary'] || '#ffffff',
        branding_text_secondary: designSettings['instagram.design.colors.branding_text_secondary'] || '#cccccc',
        branding_text_subtitle: designSettings['instagram.design.colors.branding_text_subtitle'] || '#aaaaaa',
        accent_border: designSettings['instagram.design.colors.accent_border'] || '#0a0a0a'
      },
      layout: {
        card_padding: designSettings['instagram.design.layout.card_padding'] || 100,
        content_padding: designSettings['instagram.design.layout.content_padding'] || 100,
        border_width: designSettings['instagram.design.layout.border_width'] || 6,
        title_margin_bottom: designSettings['instagram.design.layout.title_margin_bottom'] || 24,
        year_margin_top: designSettings['instagram.design.layout.year_margin_top'] || 16,
        paragraph_margin_bottom: designSettings['instagram.design.layout.paragraph_margin_bottom'] || 24
      }
    };

    // Convert story to ContentApiData format for the generator
    const storyData = {
      id: story.id,
      title: story.title,
      content: story.fiction_content,
      type: 'combined' as const,
      image_original_url: story.image_blob ? `/api/images/${story.id}/original` : undefined,
      image_thumbnail_url: story.image_blob ? `/api/images/${story.id}/thumbnail` : undefined,
      parameters: story.prompt_data,
      year: story.metadata?.year || null,
      metadata: story.metadata || undefined,
      created_at: story.created_at instanceof Date ? story.created_at.toISOString() : story.created_at
    };

    // Generate carousel slides using ProductionImageGenerator with design settings
    const carouselData = await imageGenerator.generateCarouselSlides(storyData, instagramDesignSettings);

    // Generate Instagram caption
    const caption = await imageGenerator.generateInstagramCaption(storyData);
    
    // Process slides to add previewImage for all slides
    const slidesWithPreviews = await Promise.all(
      carouselData.slides.map(async (slide, index) => {
        if (slide.type === 'original') {
          if (story.image_blob) {
            // Use the actual story image for preview
            return {
              ...slide,
              previewImage: `/api/images/${story.id}/original`
            };
          } else {
            // Create a placeholder for stories without images
            return {
              ...slide,
              previewImage: null,
              previewError: 'No image available for this story'
            };
          }
        } else {
          // Generate PNG images for other slide types using design settings
          try {
            const generatedImage = await imageGenerator.generateImageFromHTMLWithDesign(
              slide.html,
              instagramDesignSettings,
              { width: 1080, height: 1080, format: 'png' }
            );
            
            // Convert to base64 for preview
            const base64Image = `data:image/png;base64,${generatedImage.buffer.toString('base64')}`;
            
            return {
              ...slide,
              previewImage: base64Image
            };
          } catch (error) {
            console.error(`Error generating preview for slide ${index + 1}:`, error);
            return {
              ...slide,
              previewError: `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      })
    );
    
    res.json({
      success: true,
      message: 'Instagram preview generated successfully',
      data: {
        slides: slidesWithPreviews,
        caption,
        slideCount: slidesWithPreviews.length,
        theme: 'custom', // Always use custom since we're using design settings
        designSettings: instagramDesignSettings,
        storyId: story.id,
        storyTitle: story.title
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to generate Instagram preview:', error);
    next(boom.internal('Failed to generate Instagram preview', error));
  }
});

// ==================== INSTAGRAM STATUS ROUTES ====================

/**
 * @swagger
 * /api/admin/instagram/status:
 *   get:
 *     summary: Check Instagram credentials status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Instagram credentials status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                       enum: [valid, invalid, error]
 *                     facebookPageId:
 *                       type: string
 *                     instagramUsername:
 *                       type: string
 *                     lastChecked:
 *                       type: string
 *                       format: date-time
 *                     errorMessage:
 *                       type: string
 */
router.get('/instagram/status', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  let instagramService: InstagramService | null = null;
  
  try {
    // Initialize Instagram service
    try {
      instagramService = new InstagramService();
    } catch (error: any) {
      return res.json({
        success: true,
        message: 'Instagram credentials status retrieved',
        data: {
          valid: false,
          status: 'invalid',
          facebookPageId: null,
          instagramUsername: null,
          lastChecked: new Date().toISOString(),
          errorMessage: error.message || 'Instagram service initialization failed'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Ensure Instagram service was initialized successfully
    if (!instagramService) {
      return res.json({
        success: true,
        message: 'Instagram credentials status retrieved',
        data: {
          valid: false,
          status: 'error',
          facebookPageId: null,
          instagramUsername: null,
          lastChecked: new Date().toISOString(),
          errorMessage: 'Instagram service could not be initialized'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Validate credentials using detailed method
    const validationStatus = await instagramService.validateCredentialsDetailed();
    
    return res.json({
      success: true,
      message: 'Instagram credentials status retrieved',
      data: validationStatus,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to check Instagram credentials status:', error);
    
    return res.json({
      success: true,
      message: 'Instagram credentials status retrieved',
      data: {
        valid: false,
        status: 'error',
        facebookPageId: process.env.FACEBOOK_PAGE_ID || null,
        instagramUsername: null,
        lastChecked: new Date().toISOString(),
        errorMessage: error.message || 'Unknown error occurred while checking credentials'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ==================== INSTAGRAM TESTING ROUTES ====================

/**
 * @swagger
 * /api/admin/test/instagram:
 *   post:
 *     summary: Test Instagram API integration with server-side debugging
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Instagram API test results
 */
router.post('/test/instagram', async (req: TypedRequestBody<{ storyId: string }>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { storyId } = req.body;
    
    if (!storyId || typeof storyId !== 'string') {
      return next(boom.badRequest('Valid story ID is required'));
    }
    
    console.log('=== Instagram API Test Starting ===');
    console.log('Story ID:', storyId);
    
    // Initialize services
    let instagramService: InstagramService;
    try {
      instagramService = new InstagramService();
    } catch (error: any) {
      return res.json({
        success: false,
        error: `Instagram service initialization failed: ${error.message}`,
        data: { step: 'service_init', details: error.message }
      });
    }
    
    // Step 1: Get story data
    console.log('Step 1: Getting story data...');
    const story = await dataService.getGeneratedContentById(storyId);
    if (!story) {
      return res.json({
        success: false,
        error: `Story with ID ${storyId} not found`,
        data: { step: 'story_fetch', storyId }
      });
    }
    console.log('✅ Story found:', story.title);
    
    // Step 2: Load design settings
    console.log('Step 2: Loading design settings...');
    const designSettings = await dataService.getSettings();
    const instagramDesignSettings = {
      typography: {
        font_family: designSettings['instagram.design.typography.font_family'] || 'Work Sans',
        title_size: designSettings['instagram.design.typography.title_size'] || 52,
        content_size: designSettings['instagram.design.typography.content_size'] || 24,
        year_size: designSettings['instagram.design.typography.year_size'] || 28,
        branding_title_size: designSettings['instagram.design.typography.branding_title_size'] || 32,
        branding_main_size: designSettings['instagram.design.typography.branding_main_size'] || 56,
        branding_subtitle_size: designSettings['instagram.design.typography.branding_subtitle_size'] || 20,
        title_weight: designSettings['instagram.design.typography.title_weight'] || 600,
        content_weight: designSettings['instagram.design.typography.content_weight'] || 400,
        letter_spacing_title: designSettings['instagram.design.typography.letter_spacing_title'] || -0.025,
        letter_spacing_year: designSettings['instagram.design.typography.letter_spacing_year'] || 0.05,
        line_height_title: designSettings['instagram.design.typography.line_height_title'] || 1.1,
        line_height_content: designSettings['instagram.design.typography.line_height_content'] || 1.6
      },
      colors: {
        primary_background: designSettings['instagram.design.colors.primary_background'] || '#f8f8f8',
        secondary_background: designSettings['instagram.design.colors.secondary_background'] || '#f0f0f0',
        content_background: designSettings['instagram.design.colors.content_background'] || '#fdfdfd',
        branding_background: designSettings['instagram.design.colors.branding_background'] || '#0a0a0a',
        branding_background_secondary: designSettings['instagram.design.colors.branding_background_secondary'] || '#1a1a1a',
        primary_text: designSettings['instagram.design.colors.primary_text'] || '#0a0a0a',
        content_text: designSettings['instagram.design.colors.content_text'] || '#1a1a1a',
        year_text: designSettings['instagram.design.colors.year_text'] || '#666666',
        branding_text_primary: designSettings['instagram.design.colors.branding_text_primary'] || '#ffffff',
        branding_text_secondary: designSettings['instagram.design.colors.branding_text_secondary'] || '#cccccc',
        branding_text_subtitle: designSettings['instagram.design.colors.branding_text_subtitle'] || '#aaaaaa',
        accent_border: designSettings['instagram.design.colors.accent_border'] || '#0a0a0a'
      },
      layout: {
        card_padding: designSettings['instagram.design.layout.card_padding'] || 72,
        content_padding: designSettings['instagram.design.layout.content_padding'] || 72,
        border_width: designSettings['instagram.design.layout.border_width'] || 4,
        title_margin_bottom: designSettings['instagram.design.layout.title_margin_bottom'] || 32,
        year_margin_top: designSettings['instagram.design.layout.year_margin_top'] || 24,
        paragraph_margin_bottom: designSettings['instagram.design.layout.paragraph_margin_bottom'] || 24
      }
    };
    console.log('✅ Design settings loaded');
    
    // Step 3: Generate test image
    console.log('Step 3: Generating test image...');
    const storyData = {
      id: story.id,
      title: story.title,
      content: story.fiction_content,
      type: 'combined' as const,
      image_original_url: story.image_blob ? `/api/images/${story.id}/original` : undefined,
      image_thumbnail_url: story.image_blob ? `/api/images/${story.id}/thumbnail` : undefined,
      parameters: story.prompt_data,
      year: story.metadata?.year || null,
      metadata: story.metadata || undefined,
      created_at: story.created_at instanceof Date ? story.created_at.toISOString() : story.created_at
    };
    
    const carouselData = await imageGenerator.generateCarouselSlides(storyData, instagramDesignSettings);
    console.log('✅ Carousel generated, slides:', carouselData.slides.length);
    
    // Step 4: Generate and cache a test image
    console.log('Step 4: Generating test image...');
    const testSlide = carouselData.slides.find(slide => slide.type !== 'original');
    if (!testSlide) {
      return res.json({
        success: false,
        error: 'No non-original slides found to test',
        data: { step: 'test_slide_selection', slideCount: carouselData.slides.length }
      });
    }
    
    const testImageOptions = {
      width: 1080,
      height: 1080,
      quality: 95,
      format: 'jpeg' as const,
      deviceScaleFactor: 2
    };
    
    const generatedImage = await imageGenerator.generateImageFromHTMLWithDesign(
      testSlide.html, 
      instagramDesignSettings, 
      testImageOptions
    );
    console.log('✅ Test image generated, size:', generatedImage.buffer.length, 'bytes');
    
    // Step 5: Test image URL accessibility
    console.log('Step 5: Testing image URL accessibility...');
    const testImageUrl = `https://futuresofhope.org/api/instagram/images/${story.id}/1`;
    console.log('Test URL:', testImageUrl);
    
    try {
      const imageResponse = await fetch(testImageUrl);
      console.log('Image URL response status:', imageResponse.status);
      console.log('Image URL response headers:', Object.fromEntries(imageResponse.headers.entries()));
      
      if (!imageResponse.ok) {
        return res.json({
          success: false,
          error: `Image URL not accessible: ${imageResponse.status} ${imageResponse.statusText}`,
          data: { 
            step: 'image_url_test', 
            url: testImageUrl, 
            status: imageResponse.status,
            headers: Object.fromEntries(imageResponse.headers.entries())
          }
        });
      }
      console.log('✅ Image URL accessible');
    } catch (urlError: any) {
      return res.json({
        success: false,
        error: `Failed to fetch image URL: ${urlError.message}`,
        data: { step: 'image_url_test', url: testImageUrl, error: urlError.message }
      });
    }
    
    // Step 6: Test Instagram API media container creation
    console.log('Step 6: Testing Instagram API media container creation...');
    try {
      // Create a test media container (this is the call that's failing)
      const testResult = await instagramService.testMediaContainer(testImageUrl);
      console.log('✅ Instagram API test successful');
      
      return res.json({
        success: true,
        message: 'Instagram API test completed successfully',
        data: {
          story: {
            id: story.id,
            title: story.title
          },
          imageGeneration: {
            slidesCount: carouselData.slides.length,
            testImageSize: generatedImage.buffer.length,
            testImageFormat: generatedImage.format
          },
          imageUrl: {
            url: testImageUrl,
            accessible: true
          },
          instagramApi: testResult
        }
      });
      
    } catch (instagramError: any) {
      console.error('❌ Instagram API test failed:', instagramError.message);
      return res.json({
        success: false,
        error: `Instagram API test failed: ${instagramError.message}`,
        data: { 
          step: 'instagram_api_test',
          imageUrl: testImageUrl,
          error: instagramError.message,
          stack: instagramError.stack
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Instagram test failed:', error);
    next(boom.internal('Instagram test failed', error));
  }
});

export default router;