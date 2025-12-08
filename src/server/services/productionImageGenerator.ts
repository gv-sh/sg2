/**
 * Production Image Generator - High-quality HTML-to-image conversion using Puppeteer
 */

import { Page } from 'puppeteer';
import { getBrowserManager } from './browserManager.js';
import { getInstagramConfig } from '../config/instagram.config.js';
import config from '../config.js';
import type { ContentApiData } from '../../types/api.js';

interface ImageGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
  deviceScaleFactor?: number;
  timeout?: number;
}

interface GeneratedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

interface InstagramDesignSettings {
  typography: {
    font_family: string;
    title_size: number;
    content_size: number;
    year_size: number;
    branding_title_size: number;
    branding_main_size: number;
    branding_subtitle_size: number;
    title_weight: number;
    content_weight: number;
    letter_spacing_title: number;
    letter_spacing_year: number;
    line_height_title: number;
    line_height_content: number;
  };
  colors: {
    primary_background: string;
    secondary_background: string;
    content_background: string;
    branding_background: string;
    branding_background_secondary: string;
    primary_text: string;
    content_text: string;
    year_text: string;
    branding_text_primary: string;
    branding_text_secondary: string;
    branding_text_subtitle: string;
    accent_border: string;
  };
  layout: {
    card_padding: number;
    content_padding: number;
    border_width: number;
    title_margin_bottom: number;
    year_margin_top: number;
    paragraph_margin_bottom: number;
  };
}

interface CarouselSlide {
  html: string;
  description: string;
  type: 'title' | 'content' | 'branding' | 'original';
  previewImage?: string;
  previewError?: string;
}

interface GeneratedCarouselSlides {
  slides: CarouselSlide[];
  totalCount: number;
}

export class ProductionImageGenerator {
  private browserManager = getBrowserManager();
  private defaultOptions: Required<ImageGenerationOptions>;
  
  constructor() {
    const igConfig = getInstagramConfig();
    this.defaultOptions = {
      width: igConfig.imageGeneration.defaultWidth,
      height: igConfig.imageGeneration.defaultHeight,
      quality: igConfig.imageGeneration.defaultQuality,
      format: igConfig.imageGeneration.defaultFormat,
      deviceScaleFactor: igConfig.imageGeneration.deviceScaleFactor,
      timeout: igConfig.imageGeneration.timeout
    };
  }

  /**
   * Generate high-quality image from HTML content with custom design settings
   */
  async generateImageFromHTMLWithDesign(
    html: string, 
    designSettings: InstagramDesignSettings,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    const opts = { ...this.defaultOptions, ...options };
    
    return this.browserManager.withPage(async (page: Page) => {
      try {
        // Set viewport for consistent rendering
        await page.setViewport({
          width: opts.width,
          height: opts.height,
          deviceScaleFactor: opts.deviceScaleFactor
        });

        // Load HTML content with custom styling
        const styledHTML = this.wrapHTMLWithCustomStyles(html, opts, designSettings);
        
        // Use a more lenient wait strategy for better performance
        await page.setContent(styledHTML, { 
          waitUntil: 'domcontentloaded',
          timeout: Math.min(opts.timeout, 10000)
        });

        // Wait for fonts and animations to load with shorter timeout
        await this.waitForContentReady(page, opts.timeout - 10000);

        // Generate screenshot
        const buffer = await page.screenshot({
          type: opts.format,
          quality: opts.format === 'jpeg' ? opts.quality : undefined,
          fullPage: false,
          clip: {
            x: 0,
            y: 0,
            width: opts.width,
            height: opts.height
          },
          omitBackground: opts.format === 'png'
        });

        return {
          buffer: Buffer.from(buffer),
          width: opts.width * opts.deviceScaleFactor,
          height: opts.height * opts.deviceScaleFactor,
          format: opts.format
        };
      } catch (error) {
        console.error('Error generating image with design:', error);
        throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Generate high-quality image from HTML content
   */
  async generateImageFromHTML(
    html: string, 
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    const opts = { ...this.defaultOptions, ...options };
    
    return this.browserManager.withPage(async (page: Page) => {
      try {
        // Set viewport for consistent rendering
        await page.setViewport({
          width: opts.width,
          height: opts.height,
          deviceScaleFactor: opts.deviceScaleFactor
        });

        // Load HTML content with proper styling
        const styledHTML = this.wrapHTMLWithStyles(html, opts);
        
        // Use a more lenient wait strategy for better performance
        await page.setContent(styledHTML, { 
          waitUntil: 'domcontentloaded', // Changed from 'networkidle0' to 'domcontentloaded' for faster loading
          timeout: Math.min(opts.timeout, 10000) // Cap initial load timeout at 10s
        });

        // Wait for fonts and animations to load with shorter timeout
        await this.waitForContentReady(page, opts.timeout - 10000);

        // Generate screenshot
        const buffer = await page.screenshot({
          type: opts.format,
          quality: opts.format === 'jpeg' ? opts.quality : undefined,
          fullPage: false,
          clip: {
            x: 0,
            y: 0,
            width: opts.width,
            height: opts.height
          },
          omitBackground: opts.format === 'png' // Transparent background for PNG
        });

        return {
          buffer: Buffer.from(buffer),
          width: opts.width * opts.deviceScaleFactor,
          height: opts.height * opts.deviceScaleFactor,
          format: opts.format
        };
      } catch (error) {
        console.error('Error generating image:', error);
        throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Wrap HTML content with custom design settings
   */
  private wrapHTMLWithCustomStyles(
    html: string, 
    options: Required<ImageGenerationOptions>,
    settings: InstagramDesignSettings
  ): string {
    // Get font weights for Google Fonts URL
    const fontWeights = [300, 400, 500, 600, 700, 800, 900];
    const fontFamily = settings.typography.font_family.replace(/ /g, '+');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:ital,wght@${fontWeights.map(w => `0,${w}`).join(';')}&display=swap`;
    
    // Create fallback fonts based on the selected font
    let fallbackFonts = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    if (settings.typography.font_family.toLowerCase().includes('serif')) {
      fallbackFonts = 'Georgia, "Times New Roman", Times, serif';
    } else if (settings.typography.font_family.toLowerCase().includes('mono')) {
      fallbackFonts = '"SF Mono", Monaco, "Inconsolata", "Roboto Mono", "Droid Sans Mono", Consolas, monospace';
    }
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram Carousel</title>
  <!-- Direct CSS import for reliable headless loading -->
  <style>
    @import url('${fontUrl}');
    
    /* Ensure font is properly declared */
    @font-face {
      font-family: '${settings.typography.font_family}';
      font-display: block;
      font-style: normal;
      font-weight: 100 900;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: ${options.width}px;
      height: ${options.height}px;
      overflow: hidden;
      background: transparent;
      font-family: '${settings.typography.font_family}', ${fallbackFonts} !important;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'pnum' 1, 'tnum' 0, 'onum' 1, 'lnum' 0;
      font-variant-numeric: oldstyle-nums;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-optical-sizing: auto;
    }

    .carousel-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: ${settings.layout.card_padding}px;
      position: relative;
      overflow: hidden;
      color: ${settings.colors.primary_text};
      background: ${settings.colors.primary_background};
    }

    .title-card {
      background: linear-gradient(135deg, ${settings.colors.primary_background} 0%, ${settings.colors.secondary_background} 100%);
      text-align: center;
      border-left: ${settings.layout.border_width}px solid ${settings.colors.accent_border};
    }
    
    .title-card h1 {
      font-family: '${settings.typography.font_family}', ${fallbackFonts} !important;
      font-size: ${settings.typography.title_size}px;
      font-weight: ${settings.typography.title_weight};
      margin: 0 0 ${settings.layout.title_margin_bottom}px 0;
      line-height: ${settings.typography.line_height_title};
      max-width: 85%;
      color: ${settings.colors.primary_text};
      letter-spacing: ${settings.typography.letter_spacing_title}em;
      position: relative;
      z-index: 1;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    }
    
    .title-card .year {
      font-family: '${settings.typography.font_family}', ${fallbackFonts} !important;
      font-size: ${settings.typography.year_size}px;
      font-weight: 400;
      color: ${settings.colors.year_text};
      margin-top: ${settings.layout.year_margin_top}px;
      position: relative;
      z-index: 1;
      letter-spacing: ${settings.typography.letter_spacing_year}em;
      text-transform: uppercase;
      font-feature-settings: 'kern' 1, 'lnum' 1;
    }

    .content-card {
      background: linear-gradient(135deg, ${settings.colors.content_background} 0%, ${settings.colors.secondary_background} 100%);
      text-align: left;
      position: relative;
      border-left: ${settings.layout.border_width}px solid ${settings.colors.accent_border};
    }
    
    .content-card .content {
      font-family: '${settings.typography.font_family}', ${fallbackFonts} !important;
      font-size: ${settings.typography.content_size}px;
      font-weight: ${settings.typography.content_weight};
      line-height: ${settings.typography.line_height_content};
      margin: 0;
      position: relative;
      z-index: 1;
      color: ${settings.colors.content_text};
      padding: ${settings.layout.content_padding}px;
      text-align: justify;
      font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1;
      hyphens: auto;
      hyphenate-limit-chars: 6 3 3;
    }
    
    .content-card .content p {
      margin: 0 0 ${settings.layout.paragraph_margin_bottom}px 0;
      text-align: justify;
      hyphens: auto;
    }
    
    .content-card .content p:last-child {
      margin-bottom: 0;
    }

    .branding-card {
      background: linear-gradient(135deg, ${settings.colors.branding_background} 0%, ${settings.colors.branding_background_secondary} 100%);
      text-align: center;
      position: relative;
      color: ${settings.colors.branding_text_primary};
    }
    
    .branding-card h1 {
      font-size: ${settings.typography.branding_title_size}px;
      font-weight: 400;
      margin: 0 0 8px 0;
      color: ${settings.colors.branding_text_secondary};
      position: relative;
      z-index: 1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-feature-settings: 'kern' 1, 'lnum' 1;
    }
    
    .branding-card h2 {
      font-size: ${settings.typography.branding_main_size}px;
      font-weight: 600;
      margin: 0 0 32px 0;
      color: ${settings.colors.branding_text_primary};
      letter-spacing: -0.02em;
      position: relative;
      z-index: 1;
      font-feature-settings: 'kern' 1, 'liga' 1;
    }
    
    .branding-card .subtitle {
      font-size: ${settings.typography.branding_subtitle_size}px;
      font-weight: 400;
      color: ${settings.colors.branding_text_subtitle};
      margin: 0;
      position: relative;
      z-index: 1;
      line-height: 1.4;
      font-feature-settings: 'kern' 1, 'onum' 1;
    }

    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .carousel-card {
        -webkit-font-smoothing: subpixel-antialiased;
      }
    }

    p, h1, h2, h3 {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  ${html}
  <script>
    // Enhanced font loading with multiple detection mechanisms
    let fontsLoaded = false;
    
    // Method 1: Use FontFace API if available
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!fontsLoaded) {
          fontsLoaded = true;
          document.body.setAttribute('data-fonts-loaded', 'true');
        }
      }).catch(() => {
        // Fallback if fonts.ready fails
        setTimeout(() => {
          if (!fontsLoaded) {
            fontsLoaded = true;
            document.body.setAttribute('data-fonts-loaded', 'true');
          }
        }, 2000);
      });
    }
    
    // Method 2: Fallback font loading detection using canvas text measurement
    function checkFontLoad() {
      if (fontsLoaded) return;
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Test with common fallback first
        ctx.font = '16px Arial, sans-serif';
        const fallbackWidth = ctx.measureText('abcdefghijklmnopqrstuvwxyz').width;
        
        // Test with target font
        ctx.font = '16px "${settings.typography.font_family}", Arial, sans-serif';
        const targetWidth = ctx.measureText('abcdefghijklmnopqrstuvwxyz').width;
        
        // If measurements differ significantly, font is likely loaded
        if (Math.abs(targetWidth - fallbackWidth) > 2) {
          fontsLoaded = true;
          document.body.setAttribute('data-fonts-loaded', 'true');
        }
      } catch (e) {
        // Ignore measurement errors
      }
    }
    
    // Method 3: Timeout fallback (ensure we don't wait forever)
    setTimeout(() => {
      if (!fontsLoaded) {
        fontsLoaded = true;
        document.body.setAttribute('data-fonts-loaded', 'true');
      }
    }, 3000);
    
    // Check font loading every 200ms for 3 seconds
    const fontCheck = setInterval(() => {
      checkFontLoad();
      if (fontsLoaded) {
        clearInterval(fontCheck);
      }
    }, 200);
    
    // Content ready detection
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.body.setAttribute('data-content-ready', 'true');
      }, 150);
    });
    
    // Immediate fallback in case window load never fires
    setTimeout(() => {
      document.body.setAttribute('data-content-ready', 'true');
    }, 1000);
  </script>
</body>
</html>`;
  }

  /**
   * Wrap HTML content with production-ready styling
   */
  private wrapHTMLWithStyles(html: string, options: Required<ImageGenerationOptions>): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram Carousel</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: ${options.width}px;
      height: ${options.height}px;
      overflow: hidden;
      background: transparent;
      font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'pnum' 1, 'tnum' 0, 'onum' 1, 'lnum' 0;
      font-variant-numeric: oldstyle-nums;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-optical-sizing: auto;
    }

    /* MOMA-inspired carousel card styles */
    .carousel-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 72px;
      position: relative;
      overflow: hidden;
      color: #0a0a0a;
      background: #f8f8f8;
    }

    /* Museum-quality title card */
    .title-card {
      background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%);
      text-align: center;
      border-left: 4px solid #0a0a0a;
    }
    

    .title-card h1 {
      font-size: 52px;
      font-weight: 600;
      margin: 0 0 32px 0;
      line-height: 1.1;
      max-width: 85%;
      color: #0a0a0a;
      letter-spacing: -0.025em;
      position: relative;
      z-index: 1;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    }
    
    .title-card .year {
      font-size: 28px;
      font-weight: 400;
      color: #666666;
      margin-top: 24px;
      position: relative;
      z-index: 1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-feature-settings: 'kern' 1, 'lnum' 1;
    }
    

    /* Museum-quality content card */
    .content-card {
      background: linear-gradient(135deg, #fdfdfd 0%, #f5f5f5 100%);
      text-align: left;
      position: relative;
      border-left: 4px solid #0a0a0a;
    }
    
    
    .content-card .content {
      font-size: 24px;
      font-weight: 400;
      line-height: 1.6;
      margin: 0;
      position: relative;
      z-index: 1;
      color: #1a1a1a;
      padding: 72px;
      text-align: justify;
      font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1;
      hyphens: auto;
      hyphenate-limit-chars: 6 3 3;
    }
    
    .content-card .content p {
      margin: 0 0 24px 0;
      text-align: justify;
      hyphens: auto;
    }
    
    .content-card .content p:last-child {
      margin-bottom: 0;
    }
    

    /* Museum-quality branding card */
    .branding-card {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      text-align: center;
      position: relative;
      color: #f8f8f8;
    }
    
    
    .branding-card h1 {
      font-size: 32px;
      font-weight: 400;
      margin: 0 0 8px 0;
      color: #cccccc;
      position: relative;
      z-index: 1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-feature-settings: 'kern' 1, 'lnum' 1;
    }
    
    .branding-card h2 {
      font-size: 56px;
      font-weight: 600;
      margin: 0 0 32px 0;
      color: #ffffff;
      letter-spacing: -0.02em;
      position: relative;
      z-index: 1;
      font-feature-settings: 'kern' 1, 'liga' 1;
    }
    
    .branding-card .subtitle {
      font-size: 20px;
      font-weight: 400;
      color: #aaaaaa;
      margin: 0;
      position: relative;
      z-index: 1;
      line-height: 1.4;
      font-feature-settings: 'kern' 1, 'onum' 1;
    }


    /* High-DPI optimizations */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .carousel-card {
        -webkit-font-smoothing: subpixel-antialiased;
      }
    }

    /* Ensure proper text rendering */
    p, h1, h2, h3 {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  ${html}
  <script>
    // Ensure fonts are loaded before screenshot
    document.fonts.ready.then(() => {
      document.body.setAttribute('data-fonts-loaded', 'true');
    });
    
    // Mark content as ready
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.body.setAttribute('data-content-ready', 'true');
      }, 100);
    });
  </script>
</body>
</html>`;
  }

  /**
   * Wait for content to be fully ready for screenshot
   */
  private async waitForContentReady(page: Page, remainingTimeout: number = 5000): Promise<void> {
    const fontTimeout = Math.min(remainingTimeout * 0.8, 10000); // 80% of remaining time, max 10s for better font loading
    const contentTimeout = Math.min(remainingTimeout * 0.2, 2000); // 20% of remaining time, max 2s
    
    // Wait for fonts to load with dynamic timeout
    await page.waitForFunction(
      () => document.body.getAttribute('data-fonts-loaded') === 'true',
      { timeout: fontTimeout }
    ).catch(() => {
      // Only log timeout in debug mode to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Fonts loading timeout (${fontTimeout}ms), proceeding with screenshot`);
      }
    });

    // Wait for content to be ready with dynamic timeout
    await page.waitForFunction(
      () => document.body.getAttribute('data-content-ready') === 'true',
      { timeout: contentTimeout }
    ).catch(() => {
      console.warn(`Content ready timeout (${contentTimeout}ms), proceeding with screenshot`);
    });

    // Minimal delay for final rendering
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate multiple images in parallel for better performance
   */
  async generateMultipleImages(
    htmlContents: string[], 
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage[]> {
    // Limit concurrent generation to prevent resource exhaustion
    const igConfig = getInstagramConfig();
    const batchSize = igConfig.imageGeneration.maxConcurrentImages;
    const results: GeneratedImage[] = [];

    for (let i = 0; i < htmlContents.length; i += batchSize) {
      const batch = htmlContents.slice(i, i + batchSize);
      const batchPromises = batch.map(html => 
        this.generateImageFromHTML(html, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Health check for image generation service
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const testHTML = `
        <div class="carousel-card title-card">
          <h1>Health Check</h1>
          <div class="year">Test</div>
        </div>
      `;

      const result = await this.generateImageFromHTML(testHTML, {
        width: 200,
        height: 200,
        timeout: 10000
      });

      if (result.buffer.length > 0) {
        return { healthy: true, message: 'Image generation service operational' };
      } else {
        return { healthy: false, message: 'Generated image is empty' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        message: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Generate complete carousel slide data for a story using Instagram design settings
   */
  async generateCarouselSlides(
    story: ContentApiData, 
    designSettings: InstagramDesignSettings
  ): Promise<GeneratedCarouselSlides> {
    const slides: CarouselSlide[] = [];
    const maxSlides = 10; // Instagram carousel limit

    try {
      // Slide 1: Original story image (if exists)
      if (story.image_original_url) {
        slides.push({
          html: '', // Will be handled separately as it's an existing image
          description: 'Story illustration',
          type: 'original'
        });
      }

      // Slide 2: Title and year card
      const titleSlide = this.createTitleSlide(story.title, story.year, designSettings);
      slides.push(titleSlide);

      // Calculate remaining slots for content
      const hasOriginalImage = !!story.image_original_url;
      const reserveForBranding = 1;
      const maxContentSlides = maxSlides - (hasOriginalImage ? 2 : 1) - reserveForBranding;

      // Slides 3-N: Story content split into readable chunks
      const contentSlides = this.createContentSlides(story.content || '', designSettings, maxContentSlides);
      slides.push(...contentSlides);

      // Final slide: Branding card (if we have room)
      if (slides.length < maxSlides) {
        const brandingSlide = this.createBrandingSlide(designSettings);
        slides.push(brandingSlide);
      }

      // Ensure we don't exceed Instagram's limit
      const finalSlides = slides.slice(0, maxSlides);

      return {
        slides: finalSlides,
        totalCount: finalSlides.length
      };
    } catch (error) {
      console.error('Error generating carousel slides:', error);
      throw new Error(`Carousel generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a title slide with story title and year using design settings
   */
  private createTitleSlide(title: string, year: number | null, settings: InstagramDesignSettings): CarouselSlide {
    const html = `
      ${this.generateCarouselCardStyles(settings)}
      <div class="carousel-card title-card">
        <h1>${this.escapeHtml(title)}</h1>
        ${year ? `<div class="year">Year ${year}</div>` : ''}
      </div>
    `;

    return {
      html,
      description: 'Story title and setting',
      type: 'title'
    };
  }

  /**
   * Create content slides from story text using design settings
   */
  private createContentSlides(content: string, settings: InstagramDesignSettings, maxContentSlides?: number): CarouselSlide[] {
    const slides: CarouselSlide[] = [];

    // Clean and split content into paragraphs
    const paragraphs = content
      .split('\n\n')
      .filter(p => p.trim())
      .filter(p => !p.includes('**Title:'))
      .map(p => p.trim());

    if (paragraphs.length === 0) return slides;

    // Intelligent content chunking based on content length
    const chunks = this.chunkContentIntelligently(paragraphs, maxContentSlides);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const slideNumber = i + 1;

      // Process content for special formatting
      const contentHtml = chunk
        .map(p => {
          let processedParagraph = this.escapeHtml(p);

          // Highlight dialogue or quoted text
          if (p.includes('"') || p.includes("'")) {
            processedParagraph = `<span class="quote-highlight">${processedParagraph}</span>`;
          }

          return `<p>${processedParagraph}</p>`;
        })
        .join('');

      const html = `
        ${this.generateCarouselCardStyles(settings)}
        <div class="carousel-card content-card">
          <div class="content">
            ${contentHtml}
          </div>
        </div>
      `;

      slides.push({
        html,
        description: `Story content - Part ${slideNumber}`,
        type: 'content'
      });
    }

    return slides;
  }

  /**
   * Create branding slide using design settings
   */
  private createBrandingSlide(settings: InstagramDesignSettings): CarouselSlide {
    const html = `
      ${this.generateCarouselCardStyles(settings)}
      <div class="carousel-card branding-card">
        <h1>Created with</h1>
        <h2>Futures of Hope</h2>
        <p class="subtitle">Speculative futures from the Global South, <br/> co-imagined by humans and AI.</p>
      </div>
    `;

    return {
      html,
      description: 'Created with Futures of Hope',
      type: 'branding'
    };
  }

  /**
   * Generate CSS styles for carousel cards using Instagram design settings
   */
  private generateCarouselCardStyles(settings: InstagramDesignSettings): string {
    return `
    <link href="https://fonts.googleapis.com/css2?family=${settings.typography.font_family.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">
    <style>
      * {
        box-sizing: border-box;
      }
      
      .carousel-card {
        width: 1080px;
        height: 1080px;
        background: ${settings.colors.primary_background};
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        padding: ${settings.layout.card_padding}px;
        color: ${settings.colors.primary_text};
        font-family: '${settings.typography.font_family}', sans-serif;
        position: relative;
        overflow: hidden;
        background-size: cover;
        background-position: center;
      }
      
      .title-card {
        background: ${settings.colors.primary_background};
        text-align: center !important;
      }
      
      .title-card h1 {
        font-size: ${settings.typography.title_size}px !important;
        font-weight: ${settings.typography.title_weight} !important;
        margin: 0 auto ${settings.layout.title_margin_bottom}px auto !important;
        line-height: ${settings.typography.line_height_title} !important;
        letter-spacing: ${settings.typography.letter_spacing_title}em !important;
        color: ${settings.colors.primary_text} !important;
        max-width: 800px !important;
        text-align: center !important;
        padding: 0 20px !important;
        box-sizing: border-box !important;
      }
      
      .title-card .year {
        font-size: ${settings.typography.year_size}px !important;
        font-weight: 600 !important;
        color: ${settings.colors.year_text} !important;
        margin-top: ${settings.layout.year_margin_top}px !important;
        font-family: '${settings.typography.font_family}', sans-serif !important;
        letter-spacing: ${settings.typography.letter_spacing_year}em !important;
        text-align: center !important;
      }
      
      .content-card {
        background: ${settings.colors.content_background};
        text-align: center !important;
        padding: ${settings.layout.content_padding}px !important;
      }
      
      .content-card .content {
        font-size: ${settings.typography.content_size}px !important;
        line-height: ${settings.typography.line_height_content} !important;
        text-align: center !important;
        margin: 0 auto !important;
        font-weight: ${settings.typography.content_weight} !important;
        color: ${settings.colors.content_text} !important;
        padding: 20px 40px !important;
        max-width: 800px !important;
        box-sizing: border-box !important;
      }
      
      .content-card p {
        margin: 0 0 ${settings.layout.paragraph_margin_bottom}px 0 !important;
        text-align: center !important;
      }
      
      .content-card p:last-of-type {
        margin-bottom: 0 !important;
      }
      
      .quote-highlight {
        font-style: normal !important;
        color: ${settings.colors.accent_border} !important;
        font-weight: 600 !important;
        position: relative !important;
        text-align: center !important;
      }
      
      .branding-card {
        background: ${settings.colors.branding_background};
        text-align: center !important;
      }
      
      .branding-card h1 {
        font-size: ${settings.typography.branding_title_size}px !important;
        font-weight: 600 !important;
        margin: 0 0 30px 0 !important;
        color: ${settings.colors.branding_text_secondary} !important;
        letter-spacing: 0.05em !important;
        text-align: center !important;
      }
      
      .branding-card h2 {
        font-size: ${settings.typography.branding_main_size}px !important;
        font-weight: 500 !important;
        margin: 0 0 30px 0 !important;
        color: ${settings.colors.branding_text_primary} !important;
        letter-spacing: -0.02em !important;
        text-align: center !important;
      }
      
      .branding-card .subtitle {
        font-size: ${settings.typography.branding_subtitle_size}px !important;
        color: ${settings.colors.branding_text_subtitle} !important;
        margin: 0 !important;
        font-weight: 500 !important;
        letter-spacing: 0.02em !important;
        text-align: center !important;
      }
      
    </style>
  `;
  }

  /**
   * Intelligently chunk content based on visual space and readability
   */
  private chunkContentIntelligently(paragraphs: string[], maxSlides?: number): string[][] {
    const chunks: string[][] = [];
    const maxCharsPerSlide = 600; // Optimal for Instagram format
    const minCharsPerSlide = 300;

    let currentChunk: string[] = [];
    let currentChunkLength = 0;

    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length;

      // If adding this paragraph would make the chunk too long, start a new chunk
      if (currentChunk.length > 0 && 
          currentChunkLength + paragraphLength > maxCharsPerSlide) {
        
        // Only create chunk if it meets minimum size or is the last possible chunk
        if (currentChunkLength >= minCharsPerSlide || 
            (maxSlides && chunks.length >= maxSlides - 1)) {
          chunks.push([...currentChunk]);
          currentChunk = [];
          currentChunkLength = 0;
        }
      }

      // Add paragraph to current chunk
      currentChunk.push(paragraph);
      currentChunkLength += paragraphLength;

      // If we've reached max slides, break
      if (maxSlides && chunks.length >= maxSlides) {
        break;
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Limit to max slides if specified
    return maxSlides ? chunks.slice(0, maxSlides) : chunks;
  }

  /**
   * Generate Instagram-optimized caption for a story
   */
  async generateInstagramCaption(story: ContentApiData): Promise<string> {
    const analysis = this.analyzeStoryContent(story.title, story.content || '');
    const dynamicHashtags = this.generateDynamicHashtags(analysis);

    const baseHashtags = [
      '#FuturesOfHope',
      '#AIFiction',
      '#SpeculativeFiction',
      '#StoryGeneration',
      '#FutureWorlds',
      '#AIWriting',
      '#CreativeAI'
    ];

    const caption = `🔮 ${story.title.replace(/^Title:\s*/, '')}\n\n${analysis.summary}\n\n${analysis.themes.map(theme => `✨ ${theme}`).join('\n')}\n\n${[...baseHashtags, ...dynamicHashtags].join(' ')}`;

    return caption.substring(0, 2200); // Instagram character limit
  }

  /**
   * Analyze story content for themes and summary
   */
  private analyzeStoryContent(title: string, content: string): { summary: string; themes: string[] } {
    const words = content.toLowerCase();
    const themes: string[] = [];

    // Detect major themes
    if (words.includes('ai') || words.includes('artificial') || words.includes('robot') || words.includes('machine')) {
      themes.push('Artificial Intelligence & Technology');
    }
    if (words.includes('climate') || words.includes('environment') || words.includes('planet') || words.includes('earth')) {
      themes.push('Climate & Environmental Futures');
    }
    if (words.includes('society') || words.includes('community') || words.includes('social') || words.includes('people')) {
      themes.push('Social Transformation');
    }
    if (words.includes('economy') || words.includes('economic') || words.includes('wealth') || words.includes('poverty')) {
      themes.push('Economic Innovation');
    }
    if (words.includes('government') || words.includes('political') || words.includes('democracy') || words.includes('power')) {
      themes.push('Political Reimagining');
    }

    // Generate summary from first paragraph or first 200 characters
    const firstParagraph = content.split('\n')[0] || content.substring(0, 200);
    const summary = firstParagraph.length > 200 ? 
      firstParagraph.substring(0, 200) + '...' : 
      firstParagraph;

    return {
      summary: summary.trim(),
      themes: themes.length > 0 ? themes : ['Speculative Future']
    };
  }

  /**
   * Generate dynamic hashtags based on content analysis
   */
  private generateDynamicHashtags(analysis: { summary: string; themes: string[] }): string[] {
    const hashtags: string[] = [];
    
    analysis.themes.forEach(theme => {
      if (theme.includes('AI')) hashtags.push('#ArtificialIntelligence');
      if (theme.includes('Climate')) hashtags.push('#ClimateAction');
      if (theme.includes('Social')) hashtags.push('#SocialChange');
      if (theme.includes('Economic')) hashtags.push('#EconomicJustice');
      if (theme.includes('Political')) hashtags.push('#PoliticalChange');
    });

    const words = analysis.summary.toLowerCase();
    if (words.includes('hope')) hashtags.push('#Hope');
    if (words.includes('future')) hashtags.push('#Future');
    if (words.includes('change')) hashtags.push('#Change');
    if (words.includes('innovation')) hashtags.push('#Innovation');

    return hashtags.slice(0, 3); // Limit to 3 dynamic hashtags
  }

  /**
   * Escape HTML characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

// Singleton instance
let imageGeneratorInstance: ProductionImageGenerator | null = null;

export function getImageGenerator(): ProductionImageGenerator {
  if (!imageGeneratorInstance) {
    imageGeneratorInstance = new ProductionImageGenerator();
  }
  return imageGeneratorInstance;
}