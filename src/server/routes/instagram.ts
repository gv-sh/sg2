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

// Initialize services (lazy initialization for Instagram service to avoid test failures)
let instagramService: InstagramService | null = null;
const getInstagramService = () => {
  if (!instagramService) {
    instagramService = new InstagramService();
  }
  return instagramService;
};

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
 * /api/instagram/preview:
 *   post:
 *     summary: Generate Instagram carousel preview without posting
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
 *       200:
 *         description: Carousel preview generated successfully
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
 *                     slides:
 *                       type: array
 *                     caption:
 *                       type: string
 *                     slideCount:
 *                       type: number
 *                     previewUrls:
 *                       type: array
 */
router.post('/preview', asyncErrorHandler(async (req: TypedRequestBody<ShareRequestSchema>, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const validatedData = shareRequestSchema.parse(req.body);
    
    // Get the story from database
    const story = await dataService.getGeneratedContentById(validatedData.storyId);
    if (!story) {
      return next(boom.notFound(`Story with ID ${validatedData.storyId} not found`));
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

    // Generate preview URLs for the carousel images
    const previewUrls: string[] = [];
    
    // Add original image if exists
    if (story.image_blob) {
      previewUrls.push(`/api/instagram/images/${story.id}/0`);
    }

    // Add generated slide URLs
    carouselData.slides
      .filter((slide: any) => slide.type !== 'original')
      .forEach((_: any, index: number) => {
        const slideIndex = story.image_blob ? index + 1 : index;
        previewUrls.push(`/api/instagram/images/${story.id}/${slideIndex}`);
      });

    // Generate Instagram caption
    const caption = await imageProcessor.generateInstagramCaption({
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

    // Cache the carousel data for later use
    await cacheCarouselData(story.id, carouselData, caption);

    res.json({
      success: true,
      message: 'Instagram carousel preview generated successfully',
      data: {
        slides: carouselData.slides,
        caption,
        slideCount: previewUrls.length,
        previewUrls,
        storyId: story.id
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    next(boom.internal('Failed to generate Instagram preview', error));
  }
}));

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

    // Generate carousel slides and pre-generate all images
    console.log(`Generating carousel and pre-generating all images for story ${story.id}`);
    
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

    // Generate Instagram caption
    const caption = await imageProcessor.generateInstagramCaption({
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

    // PRE-GENERATE ALL IMAGES BEFORE INSTAGRAM API CALLS
    console.log(`Pre-generating ${carouselData.slides.length} images for Instagram posting...`);
    
    const imageOptions = {
      width: 1080,
      height: 1080,
      quality: 95,
      format: 'png' as const,
      deviceScaleFactor: 2,
      timeout: 12000 // Reduced timeout for individual images
    };
    
    // Prepare images to generate (exclude original images)
    const imagesToGenerate: { html: string; index: number }[] = [];
    carouselData.slides.forEach((slide: any, i: number) => {
      if (slide.type !== 'original') {
        imagesToGenerate.push({
          html: slide.html,
          index: story.image_blob ? i + 1 : i
        });
      }
    });
    
    console.log(`Generating ${imagesToGenerate.length} images in batches...`);
    
    const preGeneratedImages: { buffer: Buffer; index: number }[] = [];
    const batchSize = 2; // Process in smaller batches for better timeout handling
    
    for (let i = 0; i < imagesToGenerate.length; i += batchSize) {
      const batch = imagesToGenerate.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToGenerate.length / batchSize)}`);
      
      const batchPromises = batch.map(async ({ html, index }) => {
        const cacheKey = imageCache.generateCacheKey(html, imageOptions);
        let cachedImage = await imageCache.get(cacheKey);
        
        if (!cachedImage) {
          try {
            console.log(`Generating image for slide ${index}...`);
            const generatedImage = await imageGenerator.generateImageFromHTML(html, imageOptions);
            
            cachedImage = {
              buffer: generatedImage.buffer,
              format: generatedImage.format,
              width: generatedImage.width,
              height: generatedImage.height,
              cacheKey,
              createdAt: new Date()
            };
            
            await imageCache.set(cacheKey, cachedImage);
            console.log(`Successfully generated image for slide ${index}`);
          } catch (error) {
            console.error(`Failed to generate image for slide ${index}:`, error);
            // Create a fallback simple image instead of failing completely
            const fallbackImage = await generateFallbackImage(index, imageOptions);
            cachedImage = {
              buffer: fallbackImage.buffer,
              format: fallbackImage.format,
              width: fallbackImage.width,
              height: fallbackImage.height,
              cacheKey,
              createdAt: new Date()
            };
          }
        }
        
        return {
          buffer: cachedImage.buffer,
          index
        };
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        preGeneratedImages.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming the browser
        if (i + batchSize < imagesToGenerate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        // Continue with next batch rather than failing completely
      }
    }
    
    // Store pre-generated images in cache with story association
    await cachePreGeneratedImages(story.id, preGeneratedImages);
    
    // Generate media URLs for Instagram API (these will now serve pre-generated images)
    const mediaUrls: string[] = [];
    
    if (story.image_blob) {
      mediaUrls.push(getInstagramService().getImageUploadUrl(story.id, 0));
    }

    carouselData.slides
      .filter((slide: any) => slide.type !== 'original')
      .forEach((_: any, index: number) => {
        const slideIndex = story.image_blob ? index + 1 : index;
        mediaUrls.push(getInstagramService().getImageUploadUrl(story.id, slideIndex));
      });

    // Cache the carousel data for image serving
    await cacheCarouselData(story.id, carouselData, caption);
    
    console.log(`All ${preGeneratedImages.length} images pre-generated successfully`)

    // Create Instagram carousel post
    const carouselPost = await getInstagramService().createCarouselPost({
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
    await cacheCarouselData(story.id, carouselData, caption);

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
    const comment = await getInstagramService().addComment({
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

    // Try to get pre-generated image first (for Instagram sharing)
    const preGeneratedImage = await getPreGeneratedImage(storyId, imageIndex);
    if (preGeneratedImage) {
      console.log(`Serving pre-generated image ${imageIndex} for story ${storyId}`);
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': preGeneratedImage.length.toString(),
        'Cache-Control': 'public, max-age=86400' // 24 hours cache
      });
      
      return res.end(preGeneratedImage);
    }

    // Generate carousel slide on-demand (fallback)
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
    const slide = carouselData.slides.filter((s: any) => s.type !== 'original')[slideIndex];
    
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

// Simple in-memory cache for carousel data (in production, use Redis)
const carouselDataCache = new Map<string, { carouselData: any, caption: string, timestamp: number }>();
const preGeneratedImagesCache = new Map<string, { images: { buffer: Buffer; index: number }[], timestamp: number }>();

async function cacheCarouselData(storyId: string, carouselData: any, caption: string): Promise<void> {
  // In a production app, you might want to cache this data in Redis
  // or another cache store for faster image serving
  carouselDataCache.set(storyId, {
    carouselData,
    caption,
    timestamp: Date.now()
  });
  console.log(`Cached carousel data for story ${storyId}:`, carouselData.slides.length, 'slides');
}

async function cachePreGeneratedImages(storyId: string, images: { buffer: Buffer; index: number }[]): Promise<void> {
  preGeneratedImagesCache.set(storyId, {
    images,
    timestamp: Date.now()
  });
  console.log(`Cached ${images.length} pre-generated images for story ${storyId}`);
}

async function getCachedCarouselData(storyId: string): Promise<{ carouselData: any, caption: string } | null> {
  const cached = carouselDataCache.get(storyId);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache is older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (cached.timestamp < oneHourAgo) {
    carouselDataCache.delete(storyId);
    console.log(`Cache expired for story ${storyId}`);
    return null;
  }
  
  return {
    carouselData: cached.carouselData,
    caption: cached.caption
  };
}

async function getPreGeneratedImage(storyId: string, imageIndex: number): Promise<Buffer | null> {
  const cached = preGeneratedImagesCache.get(storyId);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache is older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (cached.timestamp < oneHourAgo) {
    preGeneratedImagesCache.delete(storyId);
    console.log(`Pre-generated images cache expired for story ${storyId}`);
    return null;
  }
  
  const image = cached.images.find(img => img.index === imageIndex);
  return image ? image.buffer : null;
}

// Fallback image generation for when HTML rendering fails
async function generateFallbackImage(index: number, options: any): Promise<{ buffer: Buffer; format: string; width: number; height: number }> {
  const fallbackHtml = `
    <div class="carousel-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; width: ${options.width}px; height: ${options.height}px; color: white; font-family: Arial, sans-serif;">
      <h1 style="font-size: 48px; margin: 20px;">Slide ${index + 1}</h1>
      <p style="font-size: 24px; opacity: 0.8;">Content unavailable</p>
    </div>
  `;
  
  return await imageGenerator.generateImageFromHTML(fallbackHtml, {
    ...options,
    timeout: 5000 // Shorter timeout for fallback
  });
}

export default router;