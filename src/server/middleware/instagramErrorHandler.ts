/**
 * Instagram Service Error Handler - Production-grade error handling and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';

interface ErrorMetrics {
  browserErrors: number;
  imageGenerationErrors: number;
  cacheErrors: number;
  instagramApiErrors: number;
  unknownErrors: number;
  totalErrors: number;
  lastErrorTime: Date | null;
}

class InstagramErrorMonitor {
  private metrics: ErrorMetrics = {
    browserErrors: 0,
    imageGenerationErrors: 0,
    cacheErrors: 0,
    instagramApiErrors: 0,
    unknownErrors: 0,
    totalErrors: 0,
    lastErrorTime: null
  };

  private errorHistory: Array<{ type: string; message: string; timestamp: Date; stack?: string }> = [];
  private maxHistorySize = 100;

  /**
   * Record an error and update metrics
   */
  recordError(error: any, type: 'browser' | 'imageGeneration' | 'cache' | 'instagramApi' | 'unknown' = 'unknown'): void {
    const now = new Date();
    
    // Update metrics
    switch (type) {
      case 'browser':
        this.metrics.browserErrors++;
        break;
      case 'imageGeneration':
        this.metrics.imageGenerationErrors++;
        break;
      case 'cache':
        this.metrics.cacheErrors++;
        break;
      case 'instagramApi':
        this.metrics.instagramApiErrors++;
        break;
      default:
        this.metrics.unknownErrors++;
    }
    
    this.metrics.totalErrors++;
    this.metrics.lastErrorTime = now;

    // Add to history
    this.errorHistory.unshift({
      type,
      message: error instanceof Error ? error.message : String(error),
      timestamp: now,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // Log error with context
    console.error(`[Instagram Service Error - ${type}]`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: now.toISOString(),
      metrics: this.metrics
    });
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent error history
   */
  getErrorHistory(limit: number = 10): Array<{ type: string; message: string; timestamp: Date }> {
    return this.errorHistory
      .slice(0, limit)
      .map(({ type, message, timestamp }) => ({ type, message, timestamp }));
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      browserErrors: 0,
      imageGenerationErrors: 0,
      cacheErrors: 0,
      instagramApiErrors: 0,
      unknownErrors: 0,
      totalErrors: 0,
      lastErrorTime: null
    };
  }

  /**
   * Get health status based on error rates
   */
  getHealthStatus(): { 
    healthy: boolean; 
    errorRate: number; 
    criticalErrors: boolean;
    message: string; 
  } {
    const totalErrors = this.metrics.totalErrors;
    const criticalErrors = this.metrics.browserErrors > 5 || this.metrics.imageGenerationErrors > 10;
    
    // Consider service unhealthy if too many errors recently
    const recentErrors = this.errorHistory.filter(
      e => Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    ).length;
    
    const errorRate = recentErrors / 5; // Errors per minute
    const healthy = errorRate < 2 && !criticalErrors;
    
    let message = 'Service operating normally';
    if (criticalErrors) {
      message = 'Critical errors detected in browser or image generation';
    } else if (errorRate >= 2) {
      message = `High error rate detected: ${errorRate.toFixed(1)} errors/min`;
    }

    return {
      healthy,
      errorRate,
      criticalErrors,
      message
    };
  }
}

// Singleton error monitor
const errorMonitor = new InstagramErrorMonitor();

/**
 * Enhanced error handler middleware for Instagram routes
 */
export function instagramErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  let errorType: 'browser' | 'imageGeneration' | 'cache' | 'instagramApi' | 'unknown' = 'unknown';
  let boomError = boom.internal('Instagram service error');

  // Classify error type based on error message/properties
  const errorMessage = err.message?.toLowerCase() || '';
  
  if (errorMessage.includes('browser') || errorMessage.includes('puppeteer') || errorMessage.includes('page')) {
    errorType = 'browser';
    boomError = boom.serverUnavailable('Browser service temporarily unavailable');
  } else if (errorMessage.includes('image generation') || errorMessage.includes('screenshot') || errorMessage.includes('html')) {
    errorType = 'imageGeneration';
    boomError = boom.serverUnavailable('Image generation service temporarily unavailable');
  } else if (errorMessage.includes('cache') || errorMessage.includes('disk') || errorMessage.includes('memory')) {
    errorType = 'cache';
    boomError = boom.serverUnavailable('Cache service temporarily unavailable');
  } else if (errorMessage.includes('instagram') || errorMessage.includes('api') || err.response?.status) {
    errorType = 'instagramApi';
    
    // Handle specific Instagram API errors
    if (err.response?.status === 401) {
      boomError = boom.unauthorized('Instagram API authentication failed');
    } else if (err.response?.status === 403) {
      boomError = boom.forbidden('Instagram API access denied');
    } else if (err.response?.status === 429) {
      boomError = boom.tooManyRequests('Instagram API rate limit exceeded');
    } else if (err.response?.status >= 500) {
      boomError = boom.badGateway('Instagram API server error');
    } else {
      boomError = boom.badGateway('Instagram API error');
    }
  }

  // Record error in monitoring system
  errorMonitor.recordError(err, errorType);

  // If error is already a Boom error, use it
  if (err.isBoom) {
    boomError = err;
  }

  // Add error tracking headers for debugging
  const errorId = `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.set({
    'X-Error-ID': errorId,
    'X-Error-Type': errorType,
    'X-Service': 'instagram'
  });

  // Enhanced error response
  const errorResponse = {
    success: false,
    message: boomError.message,
    error: {
      type: errorType,
      id: errorId,
      timestamp: new Date().toISOString(),
      // Include retry information for transient errors
      retryable: ['browser', 'imageGeneration', 'cache'].includes(errorType),
      retryAfter: ['browser', 'imageGeneration'].includes(errorType) ? 30 : 5 // seconds
    },
    meta: {
      errorMetrics: errorMonitor.getMetrics(),
      healthStatus: errorMonitor.getHealthStatus()
    }
  };

  res.status(boomError.output.statusCode).json(errorResponse);
}

/**
 * Async error wrapper for Instagram route handlers
 */
export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Get error monitoring instance for health checks
 */
export function getErrorMonitor(): InstagramErrorMonitor {
  return errorMonitor;
}

/**
 * Middleware to add error monitoring to requests
 */
export function errorMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add error monitor to request for use in route handlers
  (req as any).errorMonitor = errorMonitor;
  next();
}

export default {
  instagramErrorHandler,
  asyncErrorHandler,
  getErrorMonitor,
  errorMonitoringMiddleware
};