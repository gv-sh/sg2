/**
 * Instagram Routes - Handle Instagram carousel posting and image serving
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';
import sharp from 'sharp'; // Re-enabled with Node.js v20.19.5

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

    // Load Instagram design settings from database (same as admin route)
    const designSettings = await dataService.getSettings();
    
    // Extract design settings for Instagram using the same structure as Settings page
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

    // Generate Instagram caption using ProductionImageGenerator
    const caption = await imageGenerator.generateInstagramCaption(storyData);

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

    // Load Instagram design settings from database (same as admin route)
    const designSettings = await dataService.getSettings();
    
    // Extract design settings for Instagram using the same structure as Settings page
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

    // Generate carousel slides and pre-generate all images
    console.log(`Generating carousel and pre-generate all images for story ${story.id}`);
    
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

    // Try to get cached caption first (from preview), otherwise generate new one
    const cachedData = await getCachedCarouselData(story.id);
    let caption: string;
    
    if (cachedData?.caption) {
      console.log('Using cached Instagram caption from preview');
      caption = cachedData.caption;
    } else {
      console.log('No cached caption found, generating new Instagram caption');
      caption = await imageGenerator.generateInstagramCaption(storyData);
    }

    // PRE-GENERATE ALL IMAGES BEFORE INSTAGRAM API CALLS
    console.log(`Pre-generating images for Instagram posting...`);
    console.log(`Total slides generated: ${carouselData.slides.length}`);
    console.log(`Slide types:`, carouselData.slides.map((s: any, i: number) => `${i}: ${s.type}`));
    
    const imageOptions = {
      width: 1080,
      height: 1080,
      quality: 95,
      format: 'png' as const,
      deviceScaleFactor: 2,
      timeout: 12000 // Reduced timeout for individual images
    };
    
    // Prepare images to generate (exclude original images) - FIXED INDEXING
    const imagesToGenerate: { html: string; index: number; slideType: string }[] = [];
    let nextImageIndex = 0;
    
    // Reserve index 0 for original image if it exists
    if (story.image_blob) {
      nextImageIndex = 1;
      console.log(`Original image will be at index 0`);
    }
    
    // Process non-original slides in order
    carouselData.slides.forEach((slide: any, slidePosition: number) => {
      if (slide.type !== 'original') {
        console.log(`Slide ${slidePosition} (${slide.type}) -> Image index ${nextImageIndex}`);
        imagesToGenerate.push({
          html: slide.html,
          index: nextImageIndex,
          slideType: slide.type
        });
        nextImageIndex++;
      }
    });
    
    console.log(`Generating ${imagesToGenerate.length} images in batches...`);
    console.log(`Image indices:`, imagesToGenerate.map(img => `${img.index} (${img.slideType})`));
    
    const preGeneratedImages: { buffer: Buffer; index: number }[] = [];
    const batchSize = 2; // Process in smaller batches for better timeout handling
    
    for (let i = 0; i < imagesToGenerate.length; i += batchSize) {
      const batch = imagesToGenerate.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToGenerate.length / batchSize)}`);
      
      const batchPromises = batch.map(async ({ html, index, slideType }) => {
        const cacheKey = imageCache.generateCacheKey(html, imageOptions);
        let cachedImage = await imageCache.get(cacheKey);
        
        if (!cachedImage) {
          try {
            console.log(`Generating image for index ${index} (${slideType})...`);
            const generatedImage = await imageGenerator.generateImageFromHTMLWithDesign(html, instagramDesignSettings, imageOptions);
            
            cachedImage = {
              buffer: generatedImage.buffer,
              format: generatedImage.format,
              width: generatedImage.width,
              height: generatedImage.height,
              cacheKey,
              createdAt: new Date()
            };
            
            await imageCache.set(cacheKey, cachedImage);
            console.log(`Successfully generated image for index ${index} (${slideType})`);
          } catch (error) {
            console.error(`Failed to generate image for index ${index} (${slideType}):`, error);
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
    
    // Generate media URLs for Instagram API (these will now serve pre-generated images) - FIXED INDEXING
    const mediaUrls: string[] = [];
    let nextUrlIndex = 0;
    
    // Add original image URL first if it exists
    if (story.image_blob) {
      mediaUrls.push(getInstagramService().getImageUploadUrl(story.id, 0));
      nextUrlIndex = 1;
      console.log(`Added original image URL at index 0`);
    }

    // Add URLs for generated slides in the same order as generation
    carouselData.slides.forEach((slide: any, slidePosition: number) => {
      if (slide.type !== 'original') {
        const url = getInstagramService().getImageUploadUrl(story.id, nextUrlIndex);
        mediaUrls.push(url);
        console.log(`Added ${slide.type} slide URL at index ${nextUrlIndex} (slide position ${slidePosition})`);
        nextUrlIndex++;
      }
    });
    
    console.log(`Total media URLs: ${mediaUrls.length}`);

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
        carouselUrl: carouselPost.permalink || null,
        shortcode: carouselPost.shortcode || null,
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
        carouselUrl: carouselPost.permalink || (carouselPost.shortcode ? `https://www.instagram.com/p/${carouselPost.shortcode}/` : null),
        slideCount: mediaUrls.length,
        shortcode: carouselPost.shortcode || null
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(boom.badRequest('Validation failed', error.errors));
    }
    
    // Handle Instagram-specific errors with better messaging
    if (error.message?.startsWith('RATE_LIMITED:')) {
      return next(boom.tooManyRequests(error.message.replace('RATE_LIMITED: ', ''), {
        errorType: 'RATE_LIMITED',
        retryAfter: '1 hour',
        userMessage: 'Instagram posting limit reached. Please wait before posting again.'
      }));
    } else if (error.message?.startsWith('AUTH_ERROR:')) {
      const boomError = boom.unauthorized(error.message.replace('AUTH_ERROR: ', ''));
      boomError.output.payload.errorType = 'AUTH_ERROR';
      boomError.output.payload.userMessage = 'Instagram authentication issue. Please contact support.';
      return next(boomError);
    } else if (error.message?.includes('Instagram')) {
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

    // Load Instagram design settings from database (same as admin route)
    const designSettings = await dataService.getSettings();
    
    // Extract design settings for Instagram using the same structure as Settings page
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

    console.log(`DEBUG: imageIndex=${imageIndex}, story.image_blob length=${story.image_blob?.length || 'null'}`);
    
    // If requesting original image (index 0 and story has image)
    if (imageIndex === 0 && story.image_blob) {
      console.log(`Processing original image for story ${storyId} to square format`);
      
      // Check if we have a cached square version
      let squareImageBuffer = await getCachedSquareImage(storyId);
      
      if (!squareImageBuffer) {
        console.log(`No cached square image found, processing original image`);
        
        // Process the original image to square format using simple center cropping
        try {
          squareImageBuffer = await processImageToSquare(story.image_blob, story);
          
          // Cache the processed square image
          await cacheSquareImage(storyId, squareImageBuffer);
        } catch (error) {
          console.error(`Failed to process original image to square for story ${storyId}:`, error);
          
          // Instead of serving non-square image (which Instagram rejects),
          // return an error that will force the client to handle appropriately
          return next(boom.internal(
            `Unable to process image to square format for Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { storyId, originalSize: story.image_blob?.length }
          ));
        }
      }
      
      // Serve the square processed image
      res.set({
        'Content-Type': 'image/png', // Square images are always PNG
        'Content-Length': squareImageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // 24 hours cache
        'Access-Control-Allow-Origin': '*', // Allow Instagram to fetch
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
      return res.end(squareImageBuffer);
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

    // Calculate the correct slide index (accounting for original image) - FIXED INDEXING
    console.log(`Serving image index ${imageIndex} for story ${storyId}`);
    console.log(`Story has original image: ${!!story.image_blob}`);
    console.log(`Available slides:`, carouselData.slides.map((s: any, i: number) => `${i}: ${s.type}`));
    
    // Get non-original slides in order
    const nonOriginalSlides = carouselData.slides.filter((s: any) => s.type !== 'original');
    console.log(`Non-original slides count: ${nonOriginalSlides.length}`);
    
    // Calculate slide index: if we have original image, generated slides start at index 1
    const slideIndex = story.image_blob ? imageIndex - 1 : imageIndex;
    console.log(`Looking for slide at slideIndex ${slideIndex} in non-original slides`);
    
    const slide = nonOriginalSlides[slideIndex];
    
    if (!slide) {
      console.error(`Slide not found: imageIndex=${imageIndex}, slideIndex=${slideIndex}, available non-original slides=${nonOriginalSlides.length}`);
      return next(boom.notFound(`Slide ${imageIndex} not found`));
    }
    
    console.log(`Found slide type: ${slide.type}`);

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
      // Generate image using production Puppeteer service with design settings
      const generatedImage = await imageGenerator.generateImageFromHTMLWithDesign(slide.html, instagramDesignSettings, imageOptions);
      
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

/**
 * Convert any image to 1080x1080 square format using Sharp (preferred method)
 * Fast, efficient server-side image processing
 */
async function processImageToSquareWithSharp(imageBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('processImageToSquareWithSharp - Processing image to 1080x1080 square format using Sharp');
    console.log('processImageToSquareWithSharp - Original image size:', imageBuffer.length, 'bytes');
    
    // Get image metadata to determine cropping strategy
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    console.log('processImageToSquareWithSharp - Original dimensions:', metadata.width, 'x', metadata.height);
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }
    
    let processedImage = image;
    
    // Determine crop area for center cropping
    if (metadata.width > metadata.height) {
      // Landscape: crop from sides
      const cropWidth = metadata.height; // Make it square
      const cropX = Math.floor((metadata.width - metadata.height) / 2); // Center horizontally
      
      console.log('processImageToSquareWithSharp - Landscape crop:', cropX, 0, cropWidth, metadata.height);
      processedImage = image.extract({
        left: cropX,
        top: 0,
        width: cropWidth,
        height: metadata.height
      });
      
    } else if (metadata.height > metadata.width) {
      // Portrait: crop from top/bottom
      const cropHeight = metadata.width; // Make it square
      const cropY = Math.floor((metadata.height - metadata.width) / 2); // Center vertically
      
      console.log('processImageToSquareWithSharp - Portrait crop:', 0, cropY, metadata.width, cropHeight);
      processedImage = image.extract({
        left: 0,
        top: cropY,
        width: metadata.width,
        height: cropHeight
      });
      
    } else {
      // Already square, no cropping needed
      console.log('processImageToSquareWithSharp - Image already square, no cropping needed');
    }
    
    // Resize to exactly 1080x1080 and convert to PNG
    const squareBuffer = await processedImage
      .resize(1080, 1080, {
        kernel: sharp.kernel.lanczos3,
        fastShrinkOnLoad: true
      })
      .png({
        quality: 95,
        compressionLevel: 6
      })
      .toBuffer();
    
    console.log(`processImageToSquareWithSharp - Successfully processed to 1080x1080 square, size: ${squareBuffer.length} bytes`);
    return squareBuffer;
    
  } catch (error) {
    console.error('processImageToSquareWithSharp - Failed to process image:', error);
    throw new Error(`Sharp image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert any image to 1080x1080 square format for Instagram carousel consistency
 * Uses Canvas API through Puppeteer as fallback when Sharp fails
 */
async function processImageToSquareWithPuppeteer(imageBuffer: Buffer, story?: any): Promise<Buffer> {
  try {
    console.log('processImageToSquare - Processing image to 1080x1080 square format using simple center cropping');
    console.log('processImageToSquare - Original image size:', imageBuffer.length, 'bytes');
    
    // For very large images, optimize the base64 conversion to avoid memory issues
    let base64Image: string;
    if (imageBuffer.length > 5000000) { // > 5MB
      console.log('processImageToSquare - Large image detected, using chunked base64 conversion');
      // Process in chunks to avoid memory spikes
      const chunks: string[] = [];
      const chunkSize = 1024 * 1024; // 1MB chunks
      for (let i = 0; i < imageBuffer.length; i += chunkSize) {
        const chunk = imageBuffer.slice(i, i + chunkSize);
        chunks.push(chunk.toString('base64'));
      }
      base64Image = `data:image/png;base64,${chunks.join('')}`;
    } else {
      base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }
    
    // Create HTML page with simple Canvas center cropping
    const canvasHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: white; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="canvas" width="1080" height="1080"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          
          // Enable high quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = function() {
            console.log('Canvas: Image loaded, original dimensions:', img.width, 'x', img.height);
            
            // Simple center cropping logic
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
            
            if (img.width > img.height) {
              // Landscape: crop from sides
              sourceWidth = img.height; // Make it square
              sourceX = (img.width - img.height) / 2; // Center horizontally
            } else if (img.height > img.width) {
              // Portrait: crop from top/bottom
              sourceHeight = img.width; // Make it square
              sourceY = (img.height - img.width) / 2; // Center vertically
            }
            // If already square, no cropping needed
            
            console.log('Canvas: Cropping from:', sourceX, sourceY, 'size:', sourceWidth, 'x', sourceHeight);
            
            // Draw the cropped square portion scaled to 1080x1080
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 1080, 1080);
            
            // Get canvas data as base64 PNG
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            console.log('Canvas: Generated square image, data URL length:', dataUrl.length);
            
            // Store result for extraction
            window.canvasResult = dataUrl;
            window.processingComplete = true;
          };
          
          img.onerror = function(error) {
            console.error('Canvas: Image failed to load:', error);
            window.processingError = 'Failed to load image';
            window.processingComplete = true;
          };
          
          // Load the image
          img.src = '${base64Image}';
        </script>
      </body>
      </html>
    `;
    
    // Use Puppeteer to process the image
    const page = await browserManager.getPage();
    
    try {
      console.log('processImageToSquare - Setting page content...');
      // Set page content and wait for processing with extended timeout
      await page.setContent(canvasHtml, { 
        waitUntil: 'networkidle0',
        timeout: 30000 // 30 seconds for large images
      });
      
      console.log('processImageToSquare - Waiting for Canvas processing...');
      // Wait for Canvas processing to complete with extended timeout
      await page.waitForFunction(() => (window as any).processingComplete, { 
        timeout: 30000 // 30 seconds for large image processing
      });
      
      // Check if processing succeeded
      const processingError = await page.evaluate(() => (window as any).processingError);
      if (processingError) {
        throw new Error(`Canvas processing failed: ${processingError}`);
      }
      
      // Extract the processed image data
      const canvasDataUrl = await page.evaluate(() => (window as any).canvasResult);
      if (!canvasDataUrl || !canvasDataUrl.startsWith('data:image/png;base64,')) {
        throw new Error('Failed to generate valid canvas data URL');
      }
      
      // Convert base64 back to buffer
      const base64Data = canvasDataUrl.replace('data:image/png;base64,', '');
      const squareImageBuffer = Buffer.from(base64Data, 'base64');
      
      console.log(`processImageToSquare - Successfully processed to 1080x1080 square, size: ${squareImageBuffer.length} bytes`);
      return squareImageBuffer;
      
    } finally {
      // Always release the page
      await browserManager.releasePage(page);
    }
    
  } catch (error) {
    console.error('processImageToSquare - Failed to process image:', error);
    
    // For large images that timeout, try a simpler approach or return a rejection
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('processImageToSquare - Timeout occurred, image too large for Canvas processing');
      console.log('processImageToSquare - Consider implementing server-side image resizing as fallback');
    }
    
    // Instead of falling back to original non-square image (which Instagram rejects),
    // we should either process successfully or fail the request
    console.log('processImageToSquare - Rejecting request rather than serving non-square image');
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot serve non-square image to Instagram.`);
  }
}

/**
 * Main image processing function with fallback chain
 * Tries Sharp first, falls back to Puppeteer Canvas, then errors
 */
async function processImageToSquare(imageBuffer: Buffer, story?: any): Promise<Buffer> {
  try {
    // Try Sharp first (preferred method)
    console.log('processImageToSquare - Attempting Sharp processing...');
    return await processImageToSquareWithSharp(imageBuffer);
    
  } catch (sharpError) {
    console.warn('processImageToSquare - Sharp processing failed, falling back to Puppeteer:', sharpError instanceof Error ? sharpError.message : 'Unknown error');
    
    try {
      // Fallback to Puppeteer Canvas
      console.log('processImageToSquare - Attempting Puppeteer Canvas processing...');
      return await processImageToSquareWithPuppeteer(imageBuffer, story);
      
    } catch (puppeteerError) {
      console.error('processImageToSquare - Both Sharp and Puppeteer processing failed');
      console.error('Sharp error:', sharpError instanceof Error ? sharpError.message : 'Unknown error');
      console.error('Puppeteer error:', puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error');
      
      // Both methods failed, cannot serve non-square image to Instagram
      throw new Error(`Image processing failed: Sharp (${sharpError instanceof Error ? sharpError.message : 'Unknown error'}) and Puppeteer (${puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error'}). Cannot serve non-square image to Instagram.`);
    }
  }
}

// Simple in-memory cache for carousel data (in production, use Redis)
const carouselDataCache = new Map<string, { carouselData: any, caption: string, timestamp: number }>();
const preGeneratedImagesCache = new Map<string, { images: { buffer: Buffer; index: number }[], timestamp: number }>();
const squareImageCache = new Map<string, { buffer: Buffer, timestamp: number }>();

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

async function cacheSquareImage(storyId: string, squareImageBuffer: Buffer): Promise<void> {
  squareImageCache.set(storyId, {
    buffer: squareImageBuffer,
    timestamp: Date.now()
  });
  console.log(`Cached square image for story ${storyId}, size: ${squareImageBuffer.length} bytes`);
}

async function getCachedSquareImage(storyId: string): Promise<Buffer | null> {
  const cached = squareImageCache.get(storyId);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache is older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (cached.timestamp < oneHourAgo) {
    squareImageCache.delete(storyId);
    console.log(`Square image cache expired for story ${storyId}`);
    return null;
  }
  
  console.log(`Retrieved cached square image for story ${storyId}`);
  return cached.buffer;
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