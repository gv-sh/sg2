/**
 * Instagram Routes - Handle Instagram carousel posting and image serving
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';

import { dataService } from '../services.js';
import InstagramService from '../services/instagram.js';
import ImageProcessorService from '../services/imageProcessor.js';
import { getImageGenerator } from '../services/productionImageGenerator.js';
import { getBrowserManager } from '../services/browserManager.js';
import { getImageCache } from '../services/imageCache.js';
import { asyncErrorHandler, getErrorMonitor } from '../middleware/instagramErrorHandler.js';
import config from '../config.js';
import type {
  TypedRequestParams,
  TypedRequestBody,
  ApiResponse
} from '../../types/api.js';

const router: express.Router = express.Router();

// Initialize services
const instagramService = new InstagramService();
const imageProcessor = new ImageProcessorService();
const imageGenerator = getImageGenerator();
const browserManager = getBrowserManager();
const imageCache = getImageCache();
const errorMonitor = getErrorMonitor();

// Validation schemas
const shareRequestSchema = z.object({
  storyId: z.string().uuid(),
});

const commentRequestSchema = z.object({
  postId: z.string(),
  handle: z.string().min(1).max(50),
});

const imageParamsSchema = z.object({
  storyId: z.string().uuid(),
  imageIndex: z.string().regex(/^\d+$/),
});

// Type definitions
type ShareRequestSchema = z.infer<typeof shareRequestSchema>;
type CommentRequestSchema = z.infer<typeof commentRequestSchema>;
type ImageParamsSchema = z.infer<typeof imageParamsSchema>;

/**
 * @swagger
 * /api/instagram/share:
 *   post:
 *     summary: Share story as Instagram carousel post
 *     tags: [Instagram]
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
 *       201:
 *         description: Carousel post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                     carouselUrl:
 *                       type: string
 *                     slideCount:
 *                       type: number
 */
router.post('/share', asyncErrorHandler(async (req: TypedRequestBody<ShareRequestSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = shareRequestSchema.parse(req.body);
    
    // Get the story from database
    const story = await dataService.getGeneratedContentById(validatedData.storyId);
    if (!story) {
      return next(boom.notFound(`Story with ID ${validatedData.storyId} not found`));
    }

    // Check if story was already shared
    if (story.metadata && story.metadata.instagram && story.metadata.instagram.shared) {
      return next(boom.badRequest('This story has already been shared to Instagram'));
    }

    // Generate carousel slides
    const carouselData = await imageProcessor.generateCarouselSlides({
      id: story.id,
      title: story.title,
      content: story.fiction_content,
      type: 'combined',
      image_original_url: story.image_blob ? `/api/images/${story.id}/original` : undefined,
      image_thumbnail_url: story.image_blob ? `/api/images/${story.id}/thumbnail` : undefined,
      parameters: story.prompt_data,
      year: story.metadata?.year || null,
      metadata: story.metadata || undefined,
      created_at: story.created_at instanceof Date ? story.created_at.toISOString() : story.created_at
    });

    // Generate media URLs for Instagram API
    const mediaUrls: string[] = [];
    
    // Add original image if exists
    if (story.image_blob) {
      mediaUrls.push(instagramService.getImageUploadUrl(story.id, 0));
    }

    // Add generated slide URLs
    carouselData.slides
      .filter(slide => slide.type !== 'original')
      .forEach((_, index) => {
        const slideIndex = story.image_blob ? index + 1 : index;
        mediaUrls.push(instagramService.getImageUploadUrl(story.id, slideIndex));
      });

    // Generate Instagram caption
    const caption = imageProcessor.generateInstagramCaption({
      id: story.id,
      title: story.title,
      content: story.fiction_content,
      type: 'combined',
      image_original_url: story.image_blob ? `/api/images/${story.id}/original` : undefined,
      image_thumbnail_url: story.image_blob ? `/api/images/${story.id}/thumbnail` : undefined,
      parameters: story.prompt_data,
      year: story.metadata?.year || null,
      metadata: story.metadata || undefined,
      created_at: story.created_at instanceof Date ? story.created_at.toISOString() : story.created_at
    });

    // Create Instagram carousel post
    const carouselPost = await instagramService.createCarouselPost({
      mediaUrls,
      caption
    });

    // Update story metadata with Instagram info
    const updatedMetadata = {
      ...(story.metadata || {}),
      instagram: {
        shared: true,
        postId: carouselPost.id,
        sharedAt: new Date().toISOString(),
        slideCount: mediaUrls.length
      }
    };

    await dataService.updateGeneratedContent(story.id, {
      metadata: updatedMetadata
    });

    // Cache the carousel data for image serving
    await cacheCarouselData(story.id, carouselData);

    res.status(201).json({
      success: true,
      message: 'Instagram carousel post created successfully',
      data: {
        postId: carouselPost.id,
        carouselUrl: `https://instagram.com/p/${carouselPost.id}`,
        slideCount: mediaUrls.length
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle Instagram-specific errors
    if (error.message?.includes('Instagram')) {
      return next(boom.badGateway('Instagram API error', error));
    }
    
    next(boom.internal('Failed to share to Instagram', error));
  }
}));

/**
 * @swagger
 * /api/instagram/comment:
 *   post:
 *     summary: Add handle as reply to Instagram post
 *     tags: [Instagram]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *               handle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post('/comment', asyncErrorHandler(async (req: TypedRequestBody<CommentRequestSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = commentRequestSchema.parse(req.body);
    
    // Ensure handle starts with @
    const handle = validatedData.handle.startsWith('@') ? validatedData.handle : `@${validatedData.handle}`;
    
    // Add comment to Instagram post
    const comment = await instagramService.addComment({
      postId: validatedData.postId,
      message: `Connect with me: ${handle}`
    });

    // Find and update the story with handle info
    const stories = await dataService.getRecentContent(100);
    const story = stories.find(s => s.metadata?.instagram?.postId === validatedData.postId);
    
    if (story) {
      const updatedMetadata = {
        ...(story.metadata || {}),
        instagram: {
          ...(story.metadata && story.metadata.instagram ? story.metadata.instagram : {}),
          userHandle: handle,
          commentId: comment.id
        }
      };

      await dataService.updateGeneratedContent(story.id, {
        metadata: updatedMetadata
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        commentId: comment.id,
        handle: handle
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    if (error.message?.includes('Instagram')) {
      return next(boom.badGateway('Instagram API error', error));
    }
    
    next(boom.internal('Failed to add comment', error));
  }
}));

/**
 * @swagger
 * /api/instagram/images/{storyId}/{imageIndex}:
 *   get:
 *     summary: Get carousel image for Instagram posting
 *     tags: [Instagram]
 *     parameters:
 *       - name: storyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: imageIndex
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Carousel image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/images/:storyId/:imageIndex', asyncErrorHandler(async (req: TypedRequestParams<ImageParamsSchema>, res: Response, next: NextFunction) => {
  try {
    const { storyId, imageIndex: imageIndexStr } = req.params;
    const imageIndex = parseInt(imageIndexStr, 10);
    
    // Get the story from database
    const story = await dataService.getGeneratedContentById(storyId);
    if (!story) {
      return next(boom.notFound(`Story with ID ${storyId} not found`));
    }

    // If requesting original image (index 0 and story has image)
    if (imageIndex === 0 && story.image_blob) {
      res.set({
        'Content-Type': `image/${story.image_format || 'png'}`,
        'Content-Length': story.image_size_bytes?.toString() || '0',
        'Cache-Control': 'public, max-age=86400' // 24 hours cache
      });
      
      return res.end(story.image_blob);
    }

    // Generate carousel slide
    const carouselData = await imageProcessor.generateCarouselSlides({
      id: story.id,
      title: story.title,
      content: story.fiction_content,
      type: 'combined',
      image_original_url: story.image_blob ? `/api/images/${story.id}/original` : undefined,
      image_thumbnail_url: story.image_blob ? `/api/images/${story.id}/thumbnail` : undefined,
      parameters: story.prompt_data,
      year: story.metadata?.year || null,
      metadata: story.metadata || undefined,
      created_at: story.created_at instanceof Date ? story.created_at.toISOString() : story.created_at
    });

    // Calculate the correct slide index (accounting for original image)
    const slideIndex = story.image_blob ? imageIndex - 1 : imageIndex;
    const slide = carouselData.slides.filter(s => s.type !== 'original')[slideIndex];
    
    if (!slide) {
      return next(boom.notFound(`Slide ${imageIndex} not found`));
    }

    // Check cache first
    const imageOptions = {
      width: 1080,
      height: 1080,
      quality: 95,
      format: 'png' as const,
      deviceScaleFactor: 2
    };
    
    const cacheKey = imageCache.generateCacheKey(slide.html, imageOptions);
    let cachedImage = await imageCache.get(cacheKey);
    
    if (!cachedImage) {
      // Generate image using production Puppeteer service
      const generatedImage = await imageGenerator.generateImageFromHTML(slide.html, imageOptions);
      
      // Cache the result
      cachedImage = {
        buffer: generatedImage.buffer,
        format: generatedImage.format,
        width: generatedImage.width,
        height: generatedImage.height,
        cacheKey,
        createdAt: new Date()
      };
      
      await imageCache.set(cacheKey, cachedImage);
    }
    
    const imageBuffer = cachedImage.buffer;
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length.toString(),
      'Cache-Control': 'public, max-age=86400' // 24 hours cache
    });
    
    res.end(imageBuffer);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Invalid parameters', error.errors));
    }
    
    next(boom.internal('Failed to generate carousel image', error));
  }
}));

/**
 * @swagger
 * /api/instagram/status/{storyId}:
 *   get:
 *     summary: Get Instagram sharing status for a story
 *     tags: [Instagram]
 *     parameters:
 *       - name: storyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sharing status
 */
router.get('/status/:storyId', asyncErrorHandler(async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const { storyId } = req.params;
    
    const story = await dataService.getGeneratedContentById(storyId);
    if (!story) {
      return next(boom.notFound(`Story with ID ${storyId} not found`));
    }

    const instagramData = (story.metadata && story.metadata.instagram) ? story.metadata.instagram : {};
    
    res.json({
      success: true,
      message: 'Instagram status retrieved successfully',
      data: {
        shared: instagramData.shared || false,
        postId: instagramData.postId || null,
        sharedAt: instagramData.sharedAt || null,
        userHandle: instagramData.userHandle || null,
        slideCount: instagramData.slideCount || null
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve Instagram status', error));
  }
}));

/**
 * @swagger
 * /api/instagram/health:
 *   get:
 *     summary: Health check for Instagram image generation service
 *     tags: [Instagram]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health', asyncErrorHandler(async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    // Check browser manager health
    const browserHealth = await browserManager.healthCheck();
    
    // Check image generator health
    const imageHealth = await imageGenerator.healthCheck();
    
    // Get browser stats, cache stats, and error monitoring
    const browserStats = browserManager.getStats();
    const cacheStats = imageCache.getStats();
    const errorStats = errorMonitor.getMetrics();
    const errorHealthStatus = errorMonitor.getHealthStatus();
    
    const isHealthy = browserHealth.healthy && imageHealth.healthy && errorHealthStatus.healthy;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'Instagram service operational' : 'Instagram service experiencing issues',
      data: {
        browser: browserHealth,
        imageGeneration: imageHealth,
        cache: cacheStats,
        errorMonitoring: {
          health: errorHealthStatus,
          metrics: errorStats,
          recentErrors: errorMonitor.getErrorHistory(5)
        },
        stats: browserStats
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Health check failed', error));
  }
}));

/**
 * @swagger
 * /api/instagram/cache/clear:
 *   post:
 *     summary: Clear image cache
 *     tags: [Instagram]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear', asyncErrorHandler(async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    await imageCache.clear();
    
    res.json({
      success: true,
      message: 'Image cache cleared successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to clear cache', error));
  }
}));

/**
 * @swagger
 * /api/instagram/cache/cleanup:
 *   post:
 *     summary: Clean up expired cache items
 *     tags: [Instagram]
 *     responses:
 *       200:
 *         description: Cache cleanup completed
 */
router.post('/cache/cleanup', asyncErrorHandler(async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const cleanupResult = await imageCache.cleanup();
    
    res.json({
      success: true,
      message: 'Cache cleanup completed',
      data: cleanupResult,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to cleanup cache', error));
  }
}));

async function cacheCarouselData(storyId: string, carouselData: any): Promise<void> {
  // In a production app, you might want to cache this data in Redis
  // or another cache store for faster image serving
  console.log(`Caching carousel data for story ${storyId}:`, carouselData.slides.length, 'slides');
}

export default router;