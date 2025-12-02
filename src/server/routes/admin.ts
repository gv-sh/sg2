/**
 * Admin Routes - Category, Parameter, and Settings management
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';

import { dataService } from '../services.js';
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
        const setting = await dataService.setSetting(key, value);
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

export default router;