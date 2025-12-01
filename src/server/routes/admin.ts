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
 *     tags: [Admin - Categories]
 *     responses:
 *       200:
 *         description: List of categories
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
 *     tags: [Admin - Categories]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
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
 *     tags: [Admin - Categories]
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
 *     responses:
 *       201:
 *         description: Category created successfully
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
    next(boom.internal('Failed to create category', error));
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Admin - Categories]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
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
    next(boom.internal('Failed to update category', error));
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Admin - Categories]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
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
    next(boom.internal('Failed to delete category', error));
  }
});

// ==================== PARAMETER ROUTES ====================

/**
 * @swagger
 * /api/admin/parameters:
 *   get:
 *     summary: Get parameters with optional filtering
 *     tags: [Admin - Parameters]
 *     parameters:
 *       - name: category_id
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of parameters
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
 *     tags: [Admin - Parameters]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parameter details
 *       404:
 *         description: Parameter not found
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
 *     tags: [Admin - Parameters]
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
 *               values:
 *                 type: array
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Parameter created successfully
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
    next(boom.internal('Failed to create parameter', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   put:
 *     summary: Update parameter
 *     tags: [Admin - Parameters]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *               category_id:
 *                 type: string
 *               values:
 *                 type: array
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *       404:
 *         description: Parameter not found
 */
router.put('/parameters/:id', async (req: TypedRequest<IdParamSchema, ParameterUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = parameterUpdateSchema.parse(req.body);
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
    next(boom.internal('Failed to update parameter', error));
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   delete:
 *     summary: Delete parameter
 *     tags: [Admin - Parameters]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *       404:
 *         description: Parameter not found
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
 *     tags: [Admin - Settings]
 *     responses:
 *       200:
 *         description: Application settings
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
 *     tags: [Admin - Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
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