/**
 * Production Image Cache - In-memory and file-based caching for generated images
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getInstagramConfig } from '../config/instagram.config.js';
import config from '../config.js';

interface CachedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  cacheKey: string;
  createdAt: Date;
}

interface CacheOptions {
  maxSize: number; // Maximum number of images to cache in memory
  maxAge: number; // Maximum age in milliseconds
  enableDiskCache: boolean;
  diskCacheDir: string;
}

export class ImageCache {
  private memoryCache = new Map<string, CachedImage>();
  private accessOrder = new Map<string, Date>(); // LRU tracking
  private options: CacheOptions;
  private diskCacheDir: string;

  constructor() {
    const igConfig = getInstagramConfig();
    this.options = {
      maxSize: igConfig.cache.maxSize,
      maxAge: igConfig.cache.maxAge,
      enableDiskCache: igConfig.cache.enableDiskCache,
      diskCacheDir: igConfig.cache.diskCacheDir
    };

    this.diskCacheDir = path.resolve(this.options.diskCacheDir);
    this.initDiskCache();
  }

  /**
   * Generate cache key from HTML content and options
   */
  generateCacheKey(html: string, options: any = {}): string {
    const content = JSON.stringify({ html, options });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get image from cache
   */
  async get(cacheKey: string): Promise<CachedImage | null> {
    // Check memory cache first
    const memoryResult = this.getFromMemory(cacheKey);
    if (memoryResult) {
      this.accessOrder.set(cacheKey, new Date());
      return memoryResult;
    }

    // Check disk cache if enabled
    if (this.options.enableDiskCache) {
      const diskResult = await this.getFromDisk(cacheKey);
      if (diskResult) {
        // Promote to memory cache
        this.setInMemory(cacheKey, diskResult);
        return diskResult;
      }
    }

    return null;
  }

  /**
   * Store image in cache
   */
  async set(cacheKey: string, image: CachedImage): Promise<void> {
    // Always store in memory
    this.setInMemory(cacheKey, image);

    // Store on disk if enabled
    if (this.options.enableDiskCache) {
      await this.setOnDisk(cacheKey, image);
    }
  }

  /**
   * Get from memory cache
   */
  private getFromMemory(cacheKey: string): CachedImage | null {
    const cached = this.memoryCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.createdAt.getTime();
    if (age > this.options.maxAge) {
      this.memoryCache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Store in memory cache with LRU eviction
   */
  private setInMemory(cacheKey: string, image: CachedImage): void {
    // Remove if already exists
    if (this.memoryCache.has(cacheKey)) {
      this.memoryCache.delete(cacheKey);
    }

    // Evict least recently used items if at capacity
    while (this.memoryCache.size >= this.options.maxSize) {
      const oldestKey = this.findLeastRecentlyUsed();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    }

    // Add new item
    this.memoryCache.set(cacheKey, image);
    this.accessOrder.set(cacheKey, new Date());
  }

  /**
   * Find least recently used cache key
   */
  private findLeastRecentlyUsed(): string | null {
    let oldestKey: string | null = null;
    let oldestTime: Date | null = null;

    for (const [key, time] of this.accessOrder.entries()) {
      if (!oldestTime || time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Get from disk cache
   */
  private async getFromDisk(cacheKey: string): Promise<CachedImage | null> {
    try {
      const metaPath = path.join(this.diskCacheDir, `${cacheKey}.meta.json`);
      const imagePath = path.join(this.diskCacheDir, `${cacheKey}.bin`);

      // Check if files exist
      const [metaExists, imageExists] = await Promise.all([
        fs.access(metaPath).then(() => true).catch(() => false),
        fs.access(imagePath).then(() => true).catch(() => false)
      ]);

      if (!metaExists || !imageExists) {
        return null;
      }

      // Read metadata
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      // Check if expired
      const age = Date.now() - new Date(meta.createdAt).getTime();
      if (age > this.options.maxAge) {
        // Clean up expired files
        await this.removeFromDisk(cacheKey);
        return null;
      }

      // Read image buffer
      const buffer = await fs.readFile(imagePath);

      return {
        buffer,
        format: meta.format,
        width: meta.width,
        height: meta.height,
        cacheKey: meta.cacheKey,
        createdAt: new Date(meta.createdAt)
      };
    } catch (error) {
      console.warn(`Failed to read from disk cache for key ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Store on disk cache
   */
  private async setOnDisk(cacheKey: string, image: CachedImage): Promise<void> {
    try {
      const metaPath = path.join(this.diskCacheDir, `${cacheKey}.meta.json`);
      const imagePath = path.join(this.diskCacheDir, `${cacheKey}.bin`);

      // Prepare metadata
      const meta = {
        format: image.format,
        width: image.width,
        height: image.height,
        cacheKey: image.cacheKey,
        createdAt: image.createdAt.toISOString()
      };

      // Write files atomically
      await Promise.all([
        fs.writeFile(metaPath, JSON.stringify(meta, null, 2)),
        fs.writeFile(imagePath, image.buffer)
      ]);
    } catch (error) {
      console.warn(`Failed to write to disk cache for key ${cacheKey}:`, error);
    }
  }

  /**
   * Remove from disk cache
   */
  private async removeFromDisk(cacheKey: string): Promise<void> {
    try {
      const metaPath = path.join(this.diskCacheDir, `${cacheKey}.meta.json`);
      const imagePath = path.join(this.diskCacheDir, `${cacheKey}.bin`);

      await Promise.all([
        fs.unlink(metaPath).catch(() => {}),
        fs.unlink(imagePath).catch(() => {})
      ]);
    } catch (error) {
      console.warn(`Failed to remove from disk cache for key ${cacheKey}:`, error);
    }
  }

  /**
   * Initialize disk cache directory
   */
  private async initDiskCache(): Promise<void> {
    if (!this.options.enableDiskCache) {
      return;
    }

    try {
      await fs.mkdir(this.diskCacheDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create disk cache directory:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.accessOrder.clear();

    // Clear disk cache
    if (this.options.enableDiskCache) {
      try {
        const files = await fs.readdir(this.diskCacheDir);
        const deletePromises = files
          .filter(file => file.endsWith('.meta.json') || file.endsWith('.bin'))
          .map(file => fs.unlink(path.join(this.diskCacheDir, file)).catch(() => {}));
        
        await Promise.all(deletePromises);
      } catch (error) {
        console.warn('Failed to clear disk cache:', error);
      }
    }
  }

  /**
   * Clean up expired items
   */
  async cleanup(): Promise<{ removedMemory: number; removedDisk: number }> {
    let removedMemory = 0;
    let removedDisk = 0;

    // Clean memory cache
    const expiredKeys: string[] = [];
    for (const [key, image] of this.memoryCache.entries()) {
      const age = Date.now() - image.createdAt.getTime();
      if (age > this.options.maxAge) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
      removedMemory++;
    }

    // Clean disk cache
    if (this.options.enableDiskCache) {
      try {
        const files = await fs.readdir(this.diskCacheDir);
        const metaFiles = files.filter(file => file.endsWith('.meta.json'));

        for (const metaFile of metaFiles) {
          const metaPath = path.join(this.diskCacheDir, metaFile);
          const cacheKey = metaFile.replace('.meta.json', '');

          try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaContent);
            const age = Date.now() - new Date(meta.createdAt).getTime();

            if (age > this.options.maxAge) {
              await this.removeFromDisk(cacheKey);
              removedDisk++;
            }
          } catch (error) {
            // If we can't read metadata, remove the files
            await this.removeFromDisk(cacheKey);
            removedDisk++;
          }
        }
      } catch (error) {
        console.warn('Failed to cleanup disk cache:', error);
      }
    }

    return { removedMemory, removedDisk };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    maxSize: number;
    maxAge: number;
    enableDiskCache: boolean;
  } {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.options.maxSize,
      maxAge: this.options.maxAge,
      enableDiskCache: this.options.enableDiskCache
    };
  }
}

// Singleton instance
let imageCacheInstance: ImageCache | null = null;

export function getImageCache(): ImageCache {
  if (!imageCacheInstance) {
    imageCacheInstance = new ImageCache();
  }
  return imageCacheInstance;
}