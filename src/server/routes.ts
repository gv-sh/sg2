/**
 * SpecGen Routes - All API route handlers
 * Centralized location for admin, content, and system routes
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

import config from './config.js';
import { dataService, aiService } from './services.js';
import {
  categorySchema,
  categoryUpdateSchema,
  parameterSchema,
  parameterUpdateSchema,
  generationRequestSchema,
  contentUpdateSchema,
  contentFiltersSchema,
  parameterFiltersSchema,
  idParamSchema
} from './middleware.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== TYPE DEFINITIONS ====================

// Zod schema types
type CategorySchema = z.infer<typeof categorySchema>;
type CategoryUpdateSchema = z.infer<typeof categoryUpdateSchema>;
type ParameterSchema = z.infer<typeof parameterSchema>;
type ParameterUpdateSchema = z.infer<typeof parameterUpdateSchema>;
type GenerationRequestSchema = z.infer<typeof generationRequestSchema>;
type ContentUpdateSchema = z.infer<typeof contentUpdateSchema>;
type ContentFiltersSchema = z.infer<typeof contentFiltersSchema>;
type ParameterFiltersSchema = z.infer<typeof parameterFiltersSchema>;
type IdParamSchema = z.infer<typeof idParamSchema>;

// Express route handler types
interface TypedRequestParams<T = any> extends Request {
  params: T;
}

interface TypedRequestBody<T = any> extends Request {
  body: T;
}

interface TypedRequestQuery<T = any> extends Request {
  query: T;
}

interface TypedRequest<P = any, B = any, Q = any> extends Request {
  params: P;
  body: B;
  query: Q;
}

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

// Content types
interface ContentApiData {
  id: string;
  title: string;
  fiction_content: string;
  image_original_url?: string;
  image_thumbnail_url?: string;
  prompt_data: Record<string, any>;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface HealthStatusData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database: string;
  ai: string;
}

interface DatabaseStatsData {
  status: string;
  statistics: {
    categories: number;
    parameters: number;
    generatedContent: number;
    settings: number;
  };
  timestamp: string;
}

// ==================== API INFO ====================

// API info endpoint
router.get('/api', (req: Request, res: Response<ApiResponse>) => {
  res.json({
    name: config.get('app.name'),
    version: config.get('app.version'),
    description: config.get('app.description'),
    documentation: '/api/system/docs',
    health: '/api/system/health',
    endpoints: {
      admin: '/api/admin',
      content: '/api/content',
      system: '/api/system'
    }
  });
});

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all visible categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "science-fiction"
 *                       name:
 *                         type: string
 *                         example: "Science Fiction"
 *                       description:
 *                         type: string
 *                         example: "Futuristic stories with advanced technology"
 *                       visibility:
 *                         type: string
 *                         enum: [Show, Hide]
 *                         example: "Show"
 *                       sort_order:
 *                         type: number
 *                         example: 0
 */
router.get('/api/admin/categories', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const categories = await dataService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
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
 *         description: Category ID (kebab-case format)
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     responses:
 *       200:
 *         description: Category found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "science-fiction"
 *                     name:
 *                       type: string
 *                       example: "Science Fiction"
 *                     description:
 *                       type: string
 *                       example: "Futuristic stories with advanced technology"
 *                     visibility:
 *                       type: string
 *                       example: "Show"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category with id science-fiction not found"
 */
router.get('/api/admin/categories/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const category = await dataService.getCategoryById(id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Category name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Category description
 *               visibility:
 *                 type: string
 *                 enum: [Show, Hide]
 *                 default: Show
 *           examples:
 *             cyberpunk:
 *               summary: Cyberpunk Category
 *               value:
 *                 name: "Cyberpunk"
 *                 description: "High tech, low life dystopian futures"
 *             space-opera:
 *               summary: Space Opera Category
 *               value:
 *                 name: "Space Opera"
 *                 description: "Epic adventures across the galaxy"
 *                 visibility: "Show"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cyberpunk"
 *                     name:
 *                       type: string
 *                       example: "Cyberpunk"
 *                     description:
 *                       type: string
 *                       example: "High tech, low life dystopian futures"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 */
router.post('/api/admin/categories', async (req: TypedRequestBody<CategorySchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    const category = await dataService.createCategory(validatedData);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Category ID to update
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Show, Hide]
 *           examples:
 *             update-description:
 *               summary: Update Description
 *               value:
 *                 description: "Updated description for science fiction stories"
 *             hide-category:
 *               summary: Hide Category
 *               value:
 *                 visibility: "Hide"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated category object
 *       404:
 *         description: Category not found
 *       400:
 *         description: Validation failed
 */
router.put('/api/admin/categories/:id', async (req: TypedRequest<IdParamSchema, CategoryUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = categoryUpdateSchema.parse(req.body);
    const category = await dataService.updateCategory(id, updates);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category and its parameters
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Category ID to delete
 *         schema:
 *           type: string
 *         example: "cyberpunk"
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category with id cyberpunk not found"
 */
router.delete('/api/admin/categories/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteCategory(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Parameters
/**
 * @swagger
 * /api/admin/parameters:
 *   get:
 *     summary: Get all parameters or filter by categoryId
 *     tags: [Admin]
 *     parameters:
 *       - name: categoryId
 *         in: query
 *         description: Filter parameters by category ID
 *         schema:
 *           type: string
 *         example: "science-fiction"
 *     responses:
 *       200:
 *         description: List of parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "sci-fi-tech-level"
 *                       name:
 *                         type: string
 *                         example: "Technology Level"
 *                       type:
 *                         type: string
 *                         enum: [select, text, number, boolean, range]
 *                         example: "select"
 *                       parameter_values:
 *                         type: array
 *                         example: [{"label": "Basic", "id": "basic"}, {"label": "Advanced AI", "id": "advanced-ai"}]
 *                       required:
 *                         type: boolean
 *                         example: false
 *   post:
 *     summary: Create a new parameter
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - category_id
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [select, text, number, boolean, range]
 *               category_id:
 *                 type: string
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced, Hide]
 *                 default: Basic
 *               required:
 *                 type: boolean
 *                 default: false
 *               parameter_values:
 *                 type: array
 *                 description: For select type parameters
 *               parameter_config:
 *                 type: object
 *                 description: Additional configuration (min/max for numbers, etc.)
 *           examples:
 *             select-parameter:
 *               summary: Dropdown Selection Parameter
 *               value:
 *                 name: "Character Type"
 *                 type: "select"
 *                 category_id: "fantasy"
 *                 description: "Main character archetype"
 *                 parameter_values: [
 *                   {"label": "Wizard", "id": "wizard"},
 *                   {"label": "Warrior", "id": "warrior"},
 *                   {"label": "Rogue", "id": "rogue"}
 *                 ]
 *             number-parameter:
 *               summary: Number Range Parameter
 *               value:
 *                 name: "Character Count"
 *                 type: "number"
 *                 category_id: "general"
 *                 description: "Number of main characters"
 *                 parameter_config: {"min": 1, "max": 10, "step": 1}
 *             text-parameter:
 *               summary: Text Input Parameter
 *               value:
 *                 name: "Setting Description"
 *                 type: "text"
 *                 category_id: "custom"
 *                 description: "Custom setting description"
 *                 required: false
 *     responses:
 *       201:
 *         description: Parameter created successfully
 *       400:
 *         description: Validation failed
 */
router.get('/api/admin/parameters', async (req: TypedRequestQuery<ParameterFiltersSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { categoryId } = parameterFiltersSchema.parse(req.query);
    const parameters = categoryId 
      ? await dataService.getParametersByCategory(categoryId)
      : await dataService.getParameters();
    res.json({ success: true, data: parameters });
  } catch (error) {
    next(error);
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
 *         description: Parameter ID
 *         schema:
 *           type: string
 *         example: "sci-fi-tech-level"
 *     responses:
 *       200:
 *         description: Parameter found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sci-fi-tech-level"
 *                     name:
 *                       type: string
 *                       example: "Technology Level"
 *                     type:
 *                       type: string
 *                       example: "select"
 *                     parameter_values:
 *                       type: array
 *                       example: [{"label": "Basic", "id": "basic"}, {"label": "Advanced AI", "id": "advanced-ai"}]
 *       404:
 *         description: Parameter not found
 */
router.get('/api/admin/parameters/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const parameter = await dataService.getParameterById(id);
    res.json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

router.post('/api/admin/parameters', async (req: TypedRequestBody<ParameterSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = parameterSchema.parse(req.body);
    const parameter = await dataService.createParameter(validatedData);
    res.status(201).json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   put:
 *     summary: Update a parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Parameter ID to update
 *         schema:
 *           type: string
 *         example: "sci-fi-tech-level"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced, Hide]
 *               parameter_values:
 *                 type: array
 *                 description: For select type parameters
 *           examples:
 *             update-values:
 *               summary: Update Parameter Values
 *               value:
 *                 parameter_values: [
 *                   {"label": "Quantum Computing", "id": "quantum"},
 *                   {"label": "Neural Networks", "id": "neural"},
 *                   {"label": "Nano Technology", "id": "nano"}
 *                 ]
 *             change-visibility:
 *               summary: Change Visibility
 *               value:
 *                 visibility: "Advanced"
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *       404:
 *         description: Parameter not found
 */
router.put('/api/admin/parameters/:id', async (req: TypedRequest<IdParamSchema, ParameterUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = parameterUpdateSchema.parse(req.body);
    const parameter = await dataService.updateParameter(id, updates);
    res.json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/parameters/{id}:
 *   delete:
 *     summary: Delete a parameter
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Parameter ID to delete
 *         schema:
 *           type: string
 *         example: "old-parameter-id"
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Parameter deleted successfully"
 *       404:
 *         description: Parameter not found
 */
router.delete('/api/admin/parameters/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteParameter(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Settings
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example:
 *                     app_version: "2.0.0"
 *                     max_generations_per_session: 50
 *                     enable_image_generation: true
 *                     rate_limit_per_minute: 10
 *   put:
 *     summary: Update system settings
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           examples:
 *             rate-limits:
 *               summary: Update Rate Limits
 *               value:
 *                 max_generations_per_session: 25
 *                 rate_limit_per_minute: 5
 *             features:
 *               summary: Toggle Features
 *               value:
 *                 enable_image_generation: false
 *                 maintenance_mode: true
 *             new-setting:
 *               summary: Add New Setting
 *               value:
 *                 custom_prompt_prefix: "Generate a story about"
 *                 max_story_length: 2000
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated settings object
 *       400:
 *         description: Invalid setting values
 *       500:
 *         description: Server error updating settings
 */
router.get('/api/admin/settings', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const settings = await dataService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.put('/api/admin/settings', async (req: TypedRequestBody<Record<string, any>>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    // Simple validation - just check it's an object
    if (!req.body || typeof req.body !== 'object') {
      throw boom.badRequest('Request body must be an object');
    }
    
    const validatedData = req.body;
    
    for (const [key, value] of Object.entries(validatedData)) {
      // Auto-detect data type
      let dataType = 'string';
      if (typeof value === 'number') dataType = 'number';
      else if (typeof value === 'boolean') dataType = 'boolean';
      else if (typeof value === 'object') dataType = 'json';
      
      await dataService.setSetting(key, value, dataType);
    }
    
    const settings = await dataService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// ==================== CONTENT ROUTES ====================

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate combined fiction and image content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameters:
 *                 type: object
 *                 description: Generation parameters based on categories and settings
 *               year:
 *                 type: number
 *                 description: Optional year setting for the story
 *                 example: 2150
 *           examples:
 *             science-fiction:
 *               summary: Science Fiction Story
 *               value:
 *                 parameters:
 *                   category: "science-fiction"
 *                   technology-level: "Advanced AI"
 *                   setting: "Space Station"
 *                   character: "Scientist"
 *                 year: 2150
 *             fantasy:
 *               summary: Fantasy Story
 *               value:
 *                 parameters:
 *                   category: "fantasy"
 *                   magic-system: "Elemental Magic"
 *                   setting: "Ancient Forest"
 *                   character: "Wizard"
 *             historical:
 *               summary: Historical Fiction
 *               value:
 *                 parameters:
 *                   category: "historical"
 *                   time-period: "Victorian Era"
 *                   location: "London"
 *                   character: "Detective"
 *                 year: 1890
 *     responses:
 *       201:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "uuid-string"
 *                     title:
 *                       type: string
 *                       example: "The Quantum Paradox"
 *                     fiction_content:
 *                       type: string
 *                       example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                     image_original_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/original"
 *                     image_thumbnail_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/thumbnail"
 *                     prompt_data:
 *                       type: object
 *                       description: Parameters used to generate this content
 *                     metadata:
 *                       type: object
 *                       description: Generation metadata (model info, tokens, etc.)
 *       500:
 *         description: Generation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "OpenAI API key not configured"
 */
router.post('/api/generate', async (req: TypedRequestBody<GenerationRequestSchema>, res: Response<ApiResponse<ContentApiData>>, next: NextFunction) => {
  try {
    const { parameters, year } = generationRequestSchema.parse(req.body);
    
    const startTime = Date.now();
    const result = await aiService.generate(parameters, year);
    
    if (!result.success) {
      throw boom.internal(result.error);
    }

    const contentData = {
      title: result.title,
      fiction_content: result.content,
      image_blob: result.imageBlob || null,
      image_thumbnail: result.imageThumbnail || null,
      image_format: result.imageFormat || 'png',
      image_size_bytes: result.imageSizeBytes || 0,
      thumbnail_size_bytes: result.thumbnailSizeBytes || 0,
      prompt_data: { ...parameters, year },
      metadata: result.metadata
    };

    const savedContent = await dataService.saveGeneratedContent(contentData);
    const apiContent = await dataService.getGeneratedContentForApi(savedContent.id);
    
    res.status(201).json({ 
      success: true, 
      data: apiContent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all generated content with pagination
 *     tags: [Content]
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of items to return (max 100)
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         example: 10
 *     responses:
 *       200:
 *         description: List of generated content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "uuid-string"
 *                       title:
 *                         type: string
 *                         example: "The Quantum Paradox"
 *                       fiction_content:
 *                         type: string
 *                         example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                       image_original_url:
 *                         type: string
 *                         example: "/api/images/uuid-string/original"
 *                       image_thumbnail_url:
 *                         type: string
 *                         example: "/api/images/uuid-string/thumbnail"
 *                       prompt_data:
 *                         type: object
 *                         description: Parameters used to generate this content
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 */
router.get('/api/content', async (req: TypedRequestQuery<ContentFiltersSchema>, res: Response<ApiResponse<ContentApiData[]>>, next: NextFunction) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const limit = parseInt(filters.limit) || 20;
    
    const content = await dataService.getRecentContent(limit);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/summary:
 *   get:
 *     summary: Get content generation summary statistics
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Content summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_content:
 *                       type: number
 *                       example: 42
 *                     recent_content:
 *                       type: number
 *                       example: 5
 */
router.get('/api/content/summary', async (req: TypedRequestQuery<ContentFiltersSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const limit = parseInt(filters.limit) || 20;
    const contentType = filters.type || null;

    const content = await dataService.getRecentContent(limit, contentType);
    const summary = content.map(item => ({
      id: item.id,
      title: item.title,
      content_type: item.content_type,
      created_at: item.created_at
    }));

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/years:
 *   get:
 *     summary: Get all years with generated content
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of years that have content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: number
 *                   example: [2150, 2100, 2077, 1890]
 */
router.get('/api/content/years', async (req: Request, res: Response<ApiResponse<number[]>>, next: NextFunction) => {
  try {
    const years = await dataService.getAvailableYears();
    res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
});

// Image serving endpoints
/**
 * @swagger
 * /api/images/{id}/original:
 *   get:
 *     summary: Get original image (1024x1024)
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Original image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
router.get('/api/images/:id/original', async (req: TypedRequestParams<IdParamSchema>, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_blob) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    res.set({
      'Content-Type': `image/${content.image_format || 'png'}`,
      'Content-Length': content.image_size_bytes?.toString(),
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${id}-original"`
    });
    
    res.send(content.image_blob);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/images/{id}/thumbnail:
 *   get:
 *     summary: Get thumbnail image (150x150)
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Thumbnail image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
router.get('/api/images/:id/thumbnail', async (req: TypedRequestParams<IdParamSchema>, res: Response, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content.image_thumbnail) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found' });
    }
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': content.thumbnail_size_bytes?.toString(),
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${id}-thumbnail"`
    });
    
    res.send(content.image_thumbnail);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get specific generated content by ID
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Content found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "uuid-string"
 *                     title:
 *                       type: string
 *                       example: "The Quantum Paradox"
 *                     fiction_content:
 *                       type: string
 *                       example: "In the year 2150, Dr. Sarah Chen discovered..."
 *                     image_original_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/original"
 *                     image_thumbnail_url:
 *                       type: string
 *                       example: "/api/images/uuid-string/thumbnail"
 *                     prompt_data:
 *                       type: object
 *                       description: Parameters used to generate this content
 *       404:
 *         description: Content not found
 */
router.get('/api/content/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse<ContentApiData>>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentForApi(id);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

router.get('/api/content/:id/image', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const content = await dataService.getGeneratedContentById(id);

    if (!content.image_blob && !content.image_url) {
      throw boom.notFound('Image not found');
    }

    const responseData: Record<string, any> = {};
    if (content.image_blob) {
      responseData.imageOriginalUrl = `/api/images/${id}/original`;
      responseData.imageThumbnailUrl = `/api/images/${id}/thumbnail`;
    } else if (content.image_url) {
      responseData.imageUrl = content.image_url;
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update generated content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID to update
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Updated Story Title"
 *           examples:
 *             update-title:
 *               summary: Update Title
 *               value:
 *                 title: "The Quantum Paradox - Revised Edition"
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated content object
 *       404:
 *         description: Content not found
 *       400:
 *         description: Validation failed
 */
router.put('/api/content/:id', async (req: TypedRequest<IdParamSchema, ContentUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = contentUpdateSchema.parse(req.body);
    const content = await dataService.updateGeneratedContent(id, updates);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   delete:
 *     summary: Delete generated content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID to delete
 *         schema:
 *           type: string
 *         example: "uuid-string"
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Content deleted successfully"
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Content with id uuid-string not found"
 */
router.delete('/api/content/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await dataService.deleteGeneratedContent(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== SYSTEM ROUTES ====================

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 */
router.get('/api/system/health', async (req: Request, res: Response<ApiResponse<HealthStatusData>>) => {
  const healthStatus: HealthStatusData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.get('env'),
    version: config.get('app.version'),
    database: 'unknown',
    ai: 'unknown'
  };

  try {
    await dataService.init();
    await dataService.getCategories();
    healthStatus.database = 'connected';
  } catch (error) {
    healthStatus.database = 'disconnected';
    healthStatus.status = 'degraded';
  }

  try {
    if (config.get('ai.openai.apiKey')) {
      healthStatus.ai = 'configured';
    } else {
      healthStatus.ai = 'not_configured';
      if (!config.isTest()) {
        healthStatus.status = 'degraded';
      }
    }
  } catch (error) {
    healthStatus.ai = 'error';
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  res.status(statusCode).json({
    success: healthStatus.status === 'ok',
    data: healthStatus
  });
});

/**
 * @swagger
 * /api/system/database/init:
 *   post:
 *     summary: Initialize database with schema and default data
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Database initialized successfully"
 *       500:
 *         description: Database initialization failed
 */
router.post('/api/system/database/init', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    await dataService.init();
    res.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/system/database/status:
 *   get:
 *     summary: Get database connection status and statistics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database status and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         categories:
 *                           type: number
 *                           example: 5
 *                         parameters:
 *                           type: number
 *                           example: 23
 *                         generated_content:
 *                           type: number
 *                           example: 42
 */
router.get('/api/system/database/status', async (req: Request, res: Response<ApiResponse<DatabaseStatsData>>, next: NextFunction) => {
  try {
    await dataService.init();
    
    const stats = {
      categories: (await dataService.getCategories()).length,
      parameters: (await dataService.getParameters()).length,
      generatedContent: (await dataService.getRecentContent(1)).length,
      settings: Object.keys(await dataService.getSettings()).length
    };

    res.json({
      success: true,
      data: {
        status: 'connected',
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/system/docs.json:
 *   get:
 *     summary: Get OpenAPI specification as JSON
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete OpenAPI 3.0 specification for the API
 */
router.get('/api/system/docs.json', async (req: Request, res: Response) => {
  // Import swaggerSpec from middleware where it's configured
  const { swaggerSpec } = await import('./middleware.js');
  res.json(swaggerSpec);
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint for admin UI
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is responding
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "pong"
 */
router.get('/api/health/ping', async (req: Request, res: Response<{message: string}>) => {
  try {
    // Simple ping check - just verify server is running
    res.json({ message: 'pong' });
  } catch (error) {
    res.status(500).json({ message: 'error' });
  }
});

// Swagger documentation UI
router.use('/api/system/docs', swaggerUi.serve);
router.get('/api/system/docs', async (req: Request, res: Response, next: NextFunction) => {
  const { swaggerSpec } = await import('./middleware.js');
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SpecGen API Documentation'
  })(req, res, next);
});

export default router;