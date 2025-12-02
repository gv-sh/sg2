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
    fiction_content: content.fiction_content,
    image_original_url: content.image_original_url,
    image_thumbnail_url: content.image_thumbnail_url,
    prompt_data: content.prompt_data,
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
 *             required: [parameters, stories]
 *             properties:
 *               parameters:
 *                 type: object
 *               stories:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                   length:
 *                     type: number
 *                     minimum: 100
 *                     maximum: 2000
 *               images:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Content generated successfully
 */
router.post('/generate', async (req: TypedRequestBody<GenerationRequestSchema>, res: Response<ApiResponse<ContentApiData>>, next: NextFunction) => {
  try {
    const validatedData = generationRequestSchema.parse(req.body);
    
    // Generate content using AI service
    const result = await aiService.generate(validatedData);
    
    // Save to database first to get an ID
    const savedContent = await dataService.saveGeneratedContent({
      title: result.title,
      fiction_content: result.content,
      image_blob: result.imageBlob,
      image_thumbnail: result.imageThumbnail,
      image_format: result.imageFormat || 'jpeg',
      image_size_bytes: result.imageSizeBytes || 0,
      thumbnail_size_bytes: result.thumbnailSizeBytes || 0,
      prompt_data: validatedData.parameters,
      metadata: {
        ...result.metadata,
        imagePrompt: result.imagePrompt
      }
    });
    
    // Convert to API format
    const apiData: ContentApiData = {
      id: savedContent.id,
      title: savedContent.title,
      fiction_content: savedContent.fiction_content,
      image_original_url: savedContent.image_original_url,
      image_thumbnail_url: savedContent.image_thumbnail_url,
      prompt_data: savedContent.prompt_data,
      metadata: savedContent.metadata || undefined,
      created_at: savedContent.created_at instanceof Date ? savedContent.created_at.toISOString() : savedContent.created_at
    };
    
    res.json({
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
      return next(boom.badRequest('Invalid generation request', error.errors));
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
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         schema:
 *           type: number
 *           minimum: 0
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
 *         description: Content list retrieved successfully
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
      return next(boom.badRequest('Invalid query parameters', error.errors));
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
      recentCount: content.filter(c => new Date(c.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length
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
      url: content.image_original_url,
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
 *     summary: Update content
 *     tags: [Content]
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
 *               title:
 *                 type: string
 *               story:
 *                 type: string
 *               prompt:
 *                 type: string
 *               year:
 *                 type: number
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Content updated successfully
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
      data: updatedContent,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
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
    
    if (!content || !content.image_original_url) {
      return next(boom.notFound('Image not found'));
    }
    
    // For now, redirect to the external URL
    // In a production environment, you might want to proxy the image
    res.redirect(content.image_original_url);
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
    
    if (!content || (!content.image_blob && !content.image_original_url)) {
      return next(boom.notFound('Image not found'));
    }
    
    // Try to serve processed image data first
    if (content.image_blob) {
      try {
        const imageBuffer = content.image_blob;
        res.set({
          'Content-Type': 'image/jpeg',
          'Content-Length': imageBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400' // Cache for 1 day
        });
        return res.send(imageBuffer);
      } catch (bufferError) {
        console.warn('Failed to process image data, falling back to URL');
      }
    }
    
    // Fallback to original URL
    if (content.image_original_url) {
      return res.redirect(content.image_original_url);
    }
    
    return next(boom.notFound('No image available'));
  } catch (error: any) {
    next(boom.internal('Failed to retrieve thumbnail', error));
  }
});

export default router;