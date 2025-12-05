/**
 * Instagram Service Production Configuration
 */

export interface InstagramConfig {
  // Core Instagram API settings
  api: {
    accessToken: string;
    appId: string;
    baseUrl: string;
    version: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // Browser and image generation settings
  browser: {
    maxPages: number;
    pageTimeout: number;
    browserTimeout: number;
    retryAttempts: number;
    headless: boolean | 'new';
    executablePath?: string;
    launchArgs: string[];
  };

  // Image generation settings
  imageGeneration: {
    defaultWidth: number;
    defaultHeight: number;
    defaultQuality: number;
    defaultFormat: 'png' | 'jpeg';
    deviceScaleFactor: number;
    timeout: number;
    maxConcurrentImages: number;
  };

  // Cache settings
  cache: {
    maxSize: number;
    maxAge: number;
    enableDiskCache: boolean;
    diskCacheDir: string;
    cleanupInterval: number;
  };

  // Monitoring and performance
  monitoring: {
    enableMetrics: boolean;
    errorHistorySize: number;
    healthCheckInterval: number;
    performanceMonitoring: boolean;
  };

  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

/**
 * Get Instagram service configuration based on environment
 */
export function getInstagramConfig(): InstagramConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    api: {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
      appId: process.env.INSTAGRAM_APP_ID || '',
      baseUrl: 'https://graph.instagram.com',
      version: 'v18.0',
      timeout: parseInt(process.env.INSTAGRAM_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.INSTAGRAM_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.INSTAGRAM_RETRY_DELAY || '1000'),
    },

    browser: {
      maxPages: parseInt(process.env.INSTAGRAM_MAX_BROWSER_PAGES || (isProduction ? '5' : '2')),
      pageTimeout: parseInt(process.env.INSTAGRAM_PAGE_TIMEOUT || '30000'),
      browserTimeout: parseInt(process.env.INSTAGRAM_BROWSER_TIMEOUT || '60000'),
      retryAttempts: parseInt(process.env.INSTAGRAM_BROWSER_RETRY_ATTEMPTS || '3'),
      headless: process.env.INSTAGRAM_BROWSER_HEADLESS ? 
        (process.env.INSTAGRAM_BROWSER_HEADLESS === 'new' ? 'new' : 
         process.env.INSTAGRAM_BROWSER_HEADLESS === 'true') : 
        (isProduction ? 'new' : false),
      executablePath: process.env.INSTAGRAM_BROWSER_EXECUTABLE || 
        (isProduction ? '/usr/bin/chromium-browser' : undefined),
      launchArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080',
        ...(isProduction ? [
          '--single-process',
          '--memory-pressure-off',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ] : [])
      ]
    },

    imageGeneration: {
      defaultWidth: parseInt(process.env.INSTAGRAM_IMAGE_WIDTH || '1080'),
      defaultHeight: parseInt(process.env.INSTAGRAM_IMAGE_HEIGHT || '1080'),
      defaultQuality: parseInt(process.env.INSTAGRAM_IMAGE_QUALITY || '95'),
      defaultFormat: (process.env.INSTAGRAM_IMAGE_FORMAT as 'png' | 'jpeg') || 'png',
      deviceScaleFactor: parseInt(process.env.INSTAGRAM_DEVICE_SCALE_FACTOR || '2'),
      timeout: parseInt(process.env.INSTAGRAM_IMAGE_GENERATION_TIMEOUT || '30000'),
      maxConcurrentImages: parseInt(process.env.INSTAGRAM_MAX_CONCURRENT_IMAGES || (isProduction ? '3' : '1'))
    },

    cache: {
      maxSize: parseInt(process.env.INSTAGRAM_CACHE_MAX_SIZE || (isProduction ? '100' : '20')),
      maxAge: parseInt(process.env.INSTAGRAM_CACHE_MAX_AGE || '3600000'), // 1 hour
      enableDiskCache: process.env.INSTAGRAM_ENABLE_DISK_CACHE !== 'false',
      diskCacheDir: process.env.INSTAGRAM_DISK_CACHE_DIR || 
        (isProduction ? '/var/cache/instagram-images' : 'temp/instagram-cache'),
      cleanupInterval: parseInt(process.env.INSTAGRAM_CACHE_CLEANUP_INTERVAL || '600000') // 10 minutes
    },

    monitoring: {
      enableMetrics: process.env.INSTAGRAM_ENABLE_METRICS !== 'false',
      errorHistorySize: parseInt(process.env.INSTAGRAM_ERROR_HISTORY_SIZE || '100'),
      healthCheckInterval: parseInt(process.env.INSTAGRAM_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
      performanceMonitoring: process.env.INSTAGRAM_PERFORMANCE_MONITORING !== 'false'
    },

    rateLimiting: {
      enabled: process.env.INSTAGRAM_RATE_LIMITING !== 'false',
      windowMs: parseInt(process.env.INSTAGRAM_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.INSTAGRAM_RATE_LIMIT_MAX || (isProduction ? '50' : '10')),
      skipSuccessfulRequests: process.env.INSTAGRAM_RATE_LIMIT_SKIP_SUCCESS === 'true'
    }
  };
}

/**
 * Validate Instagram configuration
 */
export function validateInstagramConfig(config: InstagramConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required API configuration
  if (!config.api.accessToken) {
    errors.push('Instagram access token is required (INSTAGRAM_ACCESS_TOKEN)');
  }
  if (!config.api.appId) {
    errors.push('Instagram app ID is required (INSTAGRAM_APP_ID)');
  }

  // Validate numeric values
  if (config.browser.maxPages < 1 || config.browser.maxPages > 20) {
    errors.push('Browser max pages should be between 1 and 20');
  }
  if (config.imageGeneration.maxConcurrentImages < 1 || config.imageGeneration.maxConcurrentImages > 10) {
    errors.push('Max concurrent images should be between 1 and 10');
  }
  if (config.cache.maxSize < 1 || config.cache.maxSize > 1000) {
    errors.push('Cache max size should be between 1 and 1000');
  }

  // Validate image dimensions
  if (config.imageGeneration.defaultWidth < 100 || config.imageGeneration.defaultWidth > 4000) {
    errors.push('Image width should be between 100 and 4000 pixels');
  }
  if (config.imageGeneration.defaultHeight < 100 || config.imageGeneration.defaultHeight > 4000) {
    errors.push('Image height should be between 100 and 4000 pixels');
  }

  // Validate quality
  if (config.imageGeneration.defaultQuality < 10 || config.imageGeneration.defaultQuality > 100) {
    errors.push('Image quality should be between 10 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get optimized configuration for production deployment
 */
export function getProductionOptimizations(): Partial<InstagramConfig> {
  return {
    browser: {
      maxPages: 5,
      pageTimeout: 30000,
      browserTimeout: 60000,
      retryAttempts: 3,
      headless: 'new',
      launchArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--memory-pressure-off',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080'
      ]
    },
    imageGeneration: {
      defaultWidth: 1080,
      defaultHeight: 1080,
      defaultQuality: 95,
      defaultFormat: 'png',
      deviceScaleFactor: 2,
      timeout: 30000,
      maxConcurrentImages: 3
    },
    cache: {
      maxSize: 100,
      maxAge: 3600000,
      enableDiskCache: true,
      diskCacheDir: '/var/cache/instagram-images',
      cleanupInterval: 300000 // 5 minutes
    },
    monitoring: {
      enableMetrics: true,
      errorHistorySize: 100,
      healthCheckInterval: 30000, // 30 seconds
      performanceMonitoring: true
    }
  };
}

export default getInstagramConfig;