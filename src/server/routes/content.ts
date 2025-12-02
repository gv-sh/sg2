/**
 * Content Routes - Story generation, content management, and image handling
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';

import { dataService, aiService } from '../services.js';
import {
  generationRequestSchema,
  contentUpdateSchema,
  contentFiltersSchema,
  idParamSchema
} from '../middleware.js';
import type {
  TypedRequestParams,
  TypedRequestBody,
  TypedRequestQuery,
  TypedRequest,
  ApiResponse,
  ContentApiData
} from '../../types/api.js';

const router: express.Router = express.Router();

// Type definitions
type GenerationRequestSchema = z.infer<typeof generationRequestSchema>;
type ContentUpdateSchema = z.infer<typeof contentUpdateSchema>;
type ContentFiltersSchema = z.infer<typeof contentFiltersSchema>;
type IdParamSchema = z.infer<typeof idParamSchema>;

// Helper function to convert GeneratedContent to ContentApiData
function toContentApiData(content: any): ContentApiData {
  return {
    id: content.id,
    title: content.title,
    content: content.fiction_content,
    image_original_url: content.image_original_url,
    image_thumbnail_url: content.image_thumbnail_url,
    parameters: content.prompt_data,
    year: content.metadata?.year || null,
    metadata: content.metadata || undefined,
    created_at: content.created_at instanceof Date ? content.created_at.toISOString() : content.created_at
  };
}

// ==================== CONTENT GENERATION ====================

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate new content (story and image)
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
 *                 description: Story generation parameters grouped by category. Only include categories and parameters that were modified by the user.
 *                 additionalProperties:
 *                   type: object
 *                   description: Parameters within a category
 *                   additionalProperties:
 *                     oneOf:
 *                       - type: string
 *                       - type: number
 *                       - type: boolean
 *               year:
 *                 type: integer
 *                 minimum: 1900
 *                 maximum: 3000
 *                 description: Year setting for the story (optional)
 *           examples:
 *             minimal-example:
 *               summary: Minimal Request (Only genre and character)
 *               value:
 *                 parameters:
 *                   "Story Settings":
 *                     genre: "sci-fi"
 *                   "Character & Setting":
 *                     character-name: "Captain Elena Vasquez"
 *                 year: 2150
 *             partial-example:
 *               summary: Partial Request (Multiple categories, some parameters)
 *               value:
 *                 parameters:
 *                   "Story Settings":
 *                     genre: "fantasy"
 *                   "Character & Setting":
 *                     character-name: "Arjun the Scholar"
 *                     setting: "ancient-temple"
 *                   "World Building":
 *                     technology-level: 0.1
 *                 year: 2025
 *             full-example:
 *               summary: Full Request (All categories and parameters)
 *               value:
 *                 parameters:
 *                   "Story Settings":
 *                     genre: "mystery"
 *                   "Character & Setting":
 *                     setting: "modern-city"
 *                     character-name: "Inspector Priya Sharma"
 *                     special-object: "encrypted memory device"
 *                   "World Building":
 *                     population: 2000000
 *                     time-duration: 72
 *                     technology-level: 0.6
 *                   "Theme & Mood":
 *                     has-magic: false
 *                     is-sequel: true
 *                     conflict-intensity: 0.8
 *                 year: 2025
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
 *                 message:
 *                   type: string
 *                   example: "Content generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     title:
 *                       type: string
 *                       example: "The Last Colony on Mars"
 *                     content:
 *                       type: string
 *                       example: "In the year 2150, Captain Sarah Chen stood on the observation deck of the orbital station..."
 *                     image_original_url:
 *                       type: string
 *                       example: "https://oaidalleapiprodscus.blob.core.windows.net/private/..."
 *                     image_thumbnail_url:
 *                       type: string
 *                       example: "https://oaidalleapiprodscus.blob.core.windows.net/private/..."
 *                     parameters:
 *                       type: object
 *                       example: {"genre": "sci-fi", "setting": "space-station", "protagonist": "explorer"}
 *                     year:
 *                       type: integer
 *                       example: 2150
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-02T01:00:00.000Z"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     generationTime:
 *                       type: integer
 *                       example: 1250
 *                       description: Number of tokens generated
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: AI service authentication failed
 *       500:
 *         description: Internal server error
 */
router.post('/generate', async (req: TypedRequestBody<GenerationRequestSchema>, res: Response<ApiResponse<ContentApiData>>, next: NextFunction) => {
  try {
    const validatedData = generationRequestSchema.parse(req.body);
    
    // Generate content using AI service
    const result = await aiService.generate(validatedData.parameters, validatedData.year);
    
    // Save to database first to get an ID
    const contentToSave: any = {
      title: result.title,
      fiction_content: result.content,
      image_blob: result.imageBlob,
      image_format: result.imageFormat || 'png',
      image_size_bytes: result.imageSizeBytes || 0,
      prompt_data: validatedData.parameters,
      metadata: {
        ...result.metadata,
        imagePrompt: result.imagePrompt,
        year: validatedData.year
      }
    };

    const savedContent = await dataService.saveGeneratedContent(contentToSave);
    
    // Convert to API format
    const apiData: ContentApiData = {
      id: savedContent.id,
      title: savedContent.title,
      content: savedContent.fiction_content,
      image_original_url: savedContent.image_blob ? `/api/images/${savedContent.id}/original` : null,
      image_thumbnail_url: savedContent.image_blob ? `/api/images/${savedContent.id}/thumbnail` : null,
      parameters: savedContent.prompt_data,
      year: savedContent.metadata?.year || validatedData.year,
      metadata: savedContent.metadata || undefined,
      created_at: savedContent.created_at instanceof Date ? savedContent.created_at.toISOString() : savedContent.created_at
    };
    
    res.status(201).json({
      success: true,
      message: 'Content generated successfully',
      data: apiData,
      meta: {
        generationTime: result.metadata?.fiction?.tokens || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle AI service specific errors
    if (error.message?.includes('API key')) {
      return next(boom.unauthorized('AI service authentication failed'));
    }
    if (error.message?.includes('rate limit')) {
      return next(boom.tooManyRequests('AI service rate limit exceeded'));
    }
    if (error.message?.includes('quota')) {
      return next(boom.paymentRequired('AI service quota exceeded'));
    }
    
    next(boom.internal('Content generation failed', error));
  }
});

// ==================== CONTENT MANAGEMENT ====================

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get content list with optional filtering and pagination
 *     tags: [Content]
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Maximum number of items to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         example: 10
 *       - name: type
 *         in: query
 *         description: Filter by content type
 *         schema:
 *           type: string
 *         example: "fiction"
 *     responses:
 *       200:
 *         description: Content list retrieved successfully
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
 *                   example: "Content retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       title:
 *                         type: string
 *                         example: "The Last Colony on Mars"
 *                       content:
 *                         type: string
 *                         example: "In the year 2150, Captain Sarah Chen stood on the observation deck..."
 *                       image_original_url:
 *                         type: string
 *                         example: "https://oaidalleapiprodscus.blob.core.windows.net/private/..."
 *                       parameters:
 *                         type: object
 *                         example: {"genre": "sci-fi", "setting": "space-station"}
 *                       year:
 *                         type: integer
 *                         example: 2150
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-02T01:00:00.000Z"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     filters:
 *                       type: object
 *                       example: {"limit": 10}
 */
router.get('/', async (req: TypedRequestQuery<ContentFiltersSchema>, res: Response<ApiResponse<ContentApiData[]>>, next: NextFunction) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const content = await dataService.getRecentContent(filters.limit || 20);
    
    const apiContent = content.map(toContentApiData);
    
    res.json({
      success: true,
      message: 'Content retrieved successfully',
      data: apiContent,
      meta: {
        total: apiContent.length,
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    next(boom.internal('Failed to retrieve content', error));
  }
});

/**
 * @swagger
 * /api/content/summary:
 *   get:
 *     summary: Get content summary statistics
 *     tags: [Content]
 *     parameters:
 *       - name: year
 *         in: query
 *         schema:
 *           type: number
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content summary statistics
 */
router.get('/summary', async (req: TypedRequestQuery<ContentFiltersSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const filters = contentFiltersSchema.parse(req.query);
    const content = await dataService.getRecentContent(100);
    const summary = {
      total: content.length,
      withImages: content.filter(c => c.image_original_url).length,
      recentCount: content.filter(c => new Date(c.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length,
      byType: {
        fiction: content.length // All content is currently fiction
      }
    };
    
    res.json({
      success: true,
      message: 'Content summary retrieved successfully',
      data: summary,
      meta: {
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve content summary', error));
  }
});

/**
 * @swagger
 * /api/content/years:
 *   get:
 *     summary: Get available years for content filtering
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of available years
 */
router.get('/years', async (req: Request, res: Response<ApiResponse<number[]>>, next: NextFunction) => {
  try {
    const years = await dataService.getAvailableYears();
    
    res.json({
      success: true,
      message: 'Available years retrieved successfully',
      data: years,
      meta: {
        count: years.length,
        range: years.length > 0 ? { min: Math.min(...years), max: Math.max(...years) } : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve available years', error));
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get specific content by ID
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content details
 *       404:
 *         description: Content not found
 */
router.get('/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse<ContentApiData>>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content) {
      return next(boom.notFound(`Content with ID ${id} not found`));
    }
    
    res.json({
      success: true,
      message: 'Content retrieved successfully',
      data: toContentApiData(content),
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.isBoom && error.output?.statusCode === 404) {
      return next(error);
    }
    next(boom.internal('Failed to retrieve content', error));
  }
});

/**
 * @swagger
 * /api/content/{id}/image:
 *   get:
 *     summary: Get content image information
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image information
 *       404:
 *         description: Content or image not found
 */
router.get('/:id/image', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content) {
      return next(boom.notFound(`Content with ID ${id} not found`));
    }
    
    if (!content.image_original_url && !content.image_blob) {
      return next(boom.notFound('No image associated with this content'));
    }
    
    const imageInfo = {
      imageUrl: content.image_original_url || (content.image_blob ? `/api/images/${id}/original` : null),
      hasProcessedData: !!content.image_blob,
      prompt: content.metadata?.imagePrompt || 'Generated image',
      generatedAt: content.created_at
    };
    
    res.json({
      success: true,
      message: 'Image information retrieved successfully',
      data: imageInfo,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve image information', error));
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update content title
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Content ID to update
 *         schema:
 *           type: string
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title for the content
 *                 minLength: 1
 *                 maxLength: 200
 *           example:
 *             title: "The Last Colony on Mars - Updated"
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
 *                 message:
 *                   type: string
 *                   example: "Content updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     title:
 *                       type: string
 *                       example: "The Last Colony on Mars - Updated"
 *                     content:
 *                       type: string
 *                       example: "In the year 2150, Captain Sarah Chen..."
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Content not found
 */
router.put('/:id', async (req: TypedRequest<IdParamSchema, ContentUpdateSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = contentUpdateSchema.parse(req.body);
    const updatedContent = await dataService.updateGeneratedContent(id, validatedData);
    
    res.json({
      success: true,
      message: 'Content updated successfully',
      data: toContentApiData(updatedContent),
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    if (error.isBoom && error.output?.statusCode === 404) {
      return next(error);
    }
    next(boom.internal('Failed to update content', error));
  }
});

/**
 * @swagger
 * /api/content/{id}:
 *   delete:
 *     summary: Delete content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *       404:
 *         description: Content not found
 */
router.delete('/:id', async (req: TypedRequestParams<IdParamSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { id } = req.params;
    await dataService.deleteGeneratedContent(id);
    
    res.json({
      success: true,
      message: 'Content deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.isBoom && error.output?.statusCode === 404) {
      return next(error);
    }
    next(boom.internal('Failed to delete content', error));
  }
});

// ==================== IMAGE SERVING ====================

/**
 * @swagger
 * /api/images/{id}/original:
 *   get:
 *     summary: Get original image for content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
router.get('/images/:id/original', async (req: TypedRequestParams<IdParamSchema>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content || !content.image_blob) {
      return next(boom.notFound('Image not found'));
    }
    
    // Set appropriate headers and serve the image blob
    res.set({
      'Content-Type': `image/${content.image_format || 'png'}`,
      'Content-Length': content.image_size_bytes?.toString() || '0',
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    });
    
    res.end(content.image_blob);
  } catch (error: any) {
    next(boom.internal('Failed to retrieve image', error));
  }
});

/**
 * @swagger
 * /api/images/{id}/thumbnail:
 *   get:
 *     summary: Get thumbnail image for content
 *     tags: [Content]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thumbnail image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
router.get('/images/:id/thumbnail', async (req: TypedRequestParams<IdParamSchema>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const content = await dataService.getGeneratedContentById(id);
    
    if (!content || !content.image_blob) {
      return next(boom.notFound('Thumbnail not found'));
    }
    
    // Serve the original image as thumbnail (no separate thumbnail generation)
    res.set({
      'Content-Type': `image/${content.image_format || 'png'}`,
      'Content-Length': content.image_size_bytes?.toString() || '0',
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    });
    
    res.end(content.image_blob);
  } catch (error: any) {
    next(boom.internal('Failed to retrieve thumbnail', error));
  }
});

export default router;