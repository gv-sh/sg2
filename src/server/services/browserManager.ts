/**
 * Production Browser Manager - Handles Puppeteer browser lifecycle and page pooling
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import config from '../config.js';
import { getInstagramConfig } from '../config/instagram.config.js';

interface BrowserConfig {
  maxPages: number;
  pageTimeout: number;
  browserTimeout: number;
  retryAttempts: number;
  headless: boolean;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private pagePool: Page[] = [];
  private busyPages = new Set<Page>();
  private config: BrowserConfig;
  private isShuttingDown = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const igConfig = getInstagramConfig();
    this.config = {
      maxPages: igConfig.browser.maxPages,
      pageTimeout: igConfig.browser.pageTimeout,
      browserTimeout: igConfig.browser.browserTimeout,
      retryAttempts: igConfig.browser.retryAttempts,
      headless: igConfig.browser.headless
    };

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initBrowser();
    return this.initPromise;
  }

  private async _initBrowser(): Promise<void> {
    try {
      console.log('Initializing Puppeteer browser...');
      
      const igConfig = getInstagramConfig();
      
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          ...igConfig.browser.launchArgs,
          '--no-first-run',
          '--disable-extensions',
          '--disable-default-apps',
          '--no-default-browser-check',
          '--disable-infobars',
          '--disable-notifications',
          '--disable-popup-blocking',
          '--disable-translate',
          '--mute-audio'
        ],
        timeout: this.config.browserTimeout,
        ...(igConfig.browser.executablePath && {
          executablePath: igConfig.browser.executablePath
        })
      });

      // Pre-warm page pool
      await this.warmPagePool();

      console.log(`Browser initialized with ${this.pagePool.length} pages`);
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Pre-create pages for better performance
   */
  private async warmPagePool(): Promise<void> {
    if (!this.browser) return;

    const promises = [];
    for (let i = 0; i < Math.min(2, this.config.maxPages); i++) {
      promises.push(this.createNewPage());
    }

    const pages = await Promise.all(promises);
    this.pagePool.push(...pages);
  }

  /**
   * Create a new page with optimized settings
   */
  private async createNewPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    // Optimize page for image generation
    await page.setViewport({
      width: 1080,
      height: 1080,
      deviceScaleFactor: 2 // High DPI for crisp images
    });

    // Disable unnecessary resources for faster rendering
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font'].includes(resourceType)) {
        req.continue();
      } else if (['image', 'media', 'script'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set timeout for page operations
    page.setDefaultTimeout(this.config.pageTimeout);

    return page;
  }

  /**
   * Get an available page from the pool
   */
  async getPage(): Promise<Page> {
    await this.initBrowser();

    if (this.isShuttingDown) {
      throw new Error('Browser is shutting down');
    }

    // Try to get a page from the pool
    let page = this.pagePool.pop();

    // If no available pages and we haven't reached the limit, create a new one
    if (!page && (this.busyPages.size + this.pagePool.length) < this.config.maxPages) {
      page = await this.createNewPage();
    }

    // If still no page, wait for one to become available
    if (!page) {
      page = await this.waitForAvailablePage();
    }

    this.busyPages.add(page);
    return page;
  }

  /**
   * Wait for a page to become available
   */
  private async waitForAvailablePage(): Promise<Page> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for available page'));
      }, this.config.pageTimeout);

      const checkForPage = () => {
        const page = this.pagePool.pop();
        if (page) {
          clearTimeout(timeout);
          resolve(page);
        } else {
          setTimeout(checkForPage, 100);
        }
      };

      checkForPage();
    });
  }

  /**
   * Return a page to the pool
   */
  async releasePage(page: Page): Promise<void> {
    this.busyPages.delete(page);

    try {
      // Clear the page for reuse
      await page.goto('about:blank');
      await page.evaluate(() => {
        // Clear any timers or intervals
        const highestTimeoutId = setTimeout(() => {}, 0);
        clearTimeout(highestTimeoutId);
        // Clear all possible timer IDs - note: this is a rough cleanup approach
        for (let i = 1; i <= 1000; i++) {
          clearTimeout(i as any);
          clearInterval(i as any);
        }
      });

      this.pagePool.push(page);
    } catch (error) {
      console.error('Error clearing page, closing it:', error);
      await page.close().catch(() => {});
      
      // Create a replacement page if we're below the minimum
      if (this.pagePool.length === 0 && !this.isShuttingDown) {
        try {
          const newPage = await this.createNewPage();
          this.pagePool.push(newPage);
        } catch (err) {
          console.error('Failed to create replacement page:', err);
        }
      }
    }
  }

  /**
   * Execute a function with a page from the pool
   */
  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const page = await this.getPage();
    
    try {
      return await fn(page);
    } finally {
      await this.releasePage(page);
    }
  }

  /**
   * Get browser and page pool statistics
   */
  getStats(): {
    browserRunning: boolean;
    totalPages: number;
    availablePages: number;
    busyPages: number;
    isShuttingDown: boolean;
  } {
    return {
      browserRunning: !!this.browser && this.browser.connected,
      totalPages: this.pagePool.length + this.busyPages.size,
      availablePages: this.pagePool.length,
      busyPages: this.busyPages.size,
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Health check for the browser
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; stats: any }> {
    try {
      if (!this.browser || !this.browser.connected) {
        return {
          healthy: false,
          message: 'Browser not running',
          stats: this.getStats()
        };
      }

      // Try to create a simple page to test browser functionality
      await this.withPage(async (page) => {
        await page.goto('data:text/html,<h1>Health Check</h1>');
        const title = await page.$eval('h1', el => el.textContent);
        if (title !== 'Health Check') {
          throw new Error('Page rendering test failed');
        }
      });

      return {
        healthy: true,
        message: 'Browser operational',
        stats: this.getStats()
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Browser health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: this.getStats()
      };
    }
  }

  /**
   * Gracefully shutdown the browser
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down browser manager...');

    try {
      // Close all pages
      const allPages = [...this.pagePool, ...this.busyPages];
      await Promise.all(
        allPages.map(page => 
          page.close().catch(err => 
            console.error('Error closing page:', err)
          )
        )
      );

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      console.log('Browser manager shut down successfully');
    } catch (error) {
      console.error('Error during browser shutdown:', error);
    }
  }
}

// Singleton instance
let browserManagerInstance: BrowserManager | null = null;

export function getBrowserManager(): BrowserManager {
  if (!browserManagerInstance) {
    browserManagerInstance = new BrowserManager();
  }
  return browserManagerInstance;
}