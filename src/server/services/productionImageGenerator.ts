/**
 * Production Image Generator - High-quality HTML-to-image conversion using Puppeteer
 */

import { Page } from 'puppeteer';
import { getBrowserManager } from './browserManager.js';
import { getInstagramConfig } from '../config/instagram.config.js';
import config from '../config.js';

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
        await page.setContent(styledHTML, { 
          waitUntil: 'networkidle0',
          timeout: opts.timeout 
        });

        // Wait for fonts and animations to load
        await this.waitForContentReady(page);

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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-feature-settings: 'cv11', 'ss01';
      font-variant-numeric: oldstyle-nums;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* Enhanced carousel card styles */
    .carousel-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px;
      position: relative;
      overflow: hidden;
      color: white;
    }

    /* Enhanced title card */
    .title-card {
      background: #1a1a1a;
      text-align: center;
    }
    

    .title-card h1 {
      font-size: 48px;
      font-weight: 700;
      margin: 0 0 40px 0;
      line-height: 1.3;
      max-width: 90%;
      color: #ffffff;
      letter-spacing: -0.02em;
      position: relative;
      z-index: 1;
    }
    
    .title-card .year {
      font-size: 42px;
      font-weight: 600;
      color: #8b5cf6;
      margin-top: 40px;
      position: relative;
      z-index: 1;
    }
    
    .title-card .divider {
      width: 200px;
      height: 4px;
      background: linear-gradient(90deg, transparent 0%, #6366f1 20%, #8b5cf6 50%, #6366f1 80%, transparent 100%);
      margin: 40px auto;
      border-radius: 2px;
      position: relative;
      z-index: 1;
    }

    /* Enhanced content card */
    .content-card {
      background: #1a1a1a;
      text-align: left;
      position: relative;
    }
    
    
    .content-card .content {
      font-size: 28px;
      font-weight: 400;
      line-height: 1.7;
      margin: 0;
      position: relative;
      z-index: 1;
      color: #f8fafc;
      padding: 80px;
    }
    
    .content-card .content p {
      margin: 0 0 28px 0;
      text-align: justify;
      hyphens: auto;
    }
    
    .content-card .content p:last-child {
      margin-bottom: 0;
    }
    

    /* Enhanced branding card */
    .branding-card {
      background: #1a1a1a;
      text-align: center;
      position: relative;
    }
    
    
    .branding-card h1 {
      font-size: 58px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #e2e8f0;
      position: relative;
      z-index: 1;
    }
    
    .branding-card h2 {
      font-size: 74px;
      font-weight: 800;
      margin: 0 0 40px 0;
      color: #ffffff;
      letter-spacing: -0.02em;
      position: relative;
      z-index: 1;
    }
    
    .branding-card .subtitle {
      font-size: 28px;
      font-weight: 500;
      color: rgba(226, 232, 240, 0.8);
      margin: 0;
      position: relative;
      z-index: 1;
    }

    /* Animation for smoother rendering */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .carousel-card {
      animation: fadeIn 0.3s ease-out forwards;
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
  private async waitForContentReady(page: Page): Promise<void> {
    // Wait for fonts to load
    await page.waitForFunction(
      () => document.body.getAttribute('data-fonts-loaded') === 'true',
      { timeout: 5000 }
    ).catch(() => {
      console.warn('Fonts loading timeout, proceeding with screenshot');
    });

    // Wait for content to be ready
    await page.waitForFunction(
      () => document.body.getAttribute('data-content-ready') === 'true',
      { timeout: 2000 }
    ).catch(() => {
      console.warn('Content ready timeout, proceeding with screenshot');
    });

    // Additional small delay for any remaining rendering
    await new Promise(resolve => setTimeout(resolve, 200));
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
          <div class="divider"></div>
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
}

// Singleton instance
let imageGeneratorInstance: ProductionImageGenerator | null = null;

export function getImageGenerator(): ProductionImageGenerator {
  if (!imageGeneratorInstance) {
    imageGeneratorInstance = new ProductionImageGenerator();
  }
  return imageGeneratorInstance;
}