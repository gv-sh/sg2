/**
 * System Routes - Health checks, database management, and API documentation
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import swaggerUi from 'swagger-ui-express';

import config from '../config.js';
import { dataService } from '../services.js';
import { swaggerSpec } from '../middleware.js';
import type {
  ApiResponse,
  HealthStatusData,
  DatabaseStatsData
} from '../../types/api.js';

const router: express.Router = express.Router();

// ==================== HEALTH & STATUS ====================

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Get system health status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health information
 */
router.get('/health', async (req: Request, res: Response<ApiResponse<HealthStatusData>>) => {
  try {
    // Check database connectivity
    let dbHealth = { connected: true, message: 'Database operational' };
    try {
      await dataService.getSettings(); // Simple test query
    } catch (error: any) {
      dbHealth = { connected: false, message: error.message };
    }
    
    // Check AI service (basic config validation)
    const aiConfig = config.getAIConfig();
    const aiHealth = {
      configured: !!aiConfig.apiKey && aiConfig.apiKey !== 'test-key',
      model: aiConfig.model
    };
    
    const healthData: HealthStatusData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.get('app.version'),
      environment: config.get('env'),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
        external: process.memoryUsage().external / 1024 / 1024 // MB
      },
      database: dbHealth,
      ai: aiHealth,
      features: {
        rateLimiting: config.isFeatureEnabled('enableRateLimit'),
        cache: config.isFeatureEnabled('enableCache'),
        metrics: config.isFeatureEnabled('enableMetrics')
      }
    };
    
    // Determine overall health status
    if (!dbHealth.connected || !aiHealth.configured) {
      healthData.status = 'degraded';
    }
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthData.status === 'healthy',
      message: `System is ${healthData.status}`,
      data: healthData,
      meta: {
        timestamp: healthData.timestamp
      }
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: 'System health check failed',
      error: error.message,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: config.get('app.version'),
        environment: config.get('env')
      } as HealthStatusData
    });
  }
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint for basic health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/ping', async (req: Request, res: Response) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== DATABASE MANAGEMENT ====================

/**
 * @swagger
 * /api/system/database/init:
 *   post:
 *     summary: Initialize database with default data
 *     tags: [System - Database]
 *     responses:
 *       200:
 *         description: Database initialized successfully
 */
router.post('/database/init', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    // Initialize database (using existing init method)
    await dataService.init();
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Database initialization failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/status:
 *   get:
 *     summary: Get database statistics and status
 *     tags: [System - Database]
 *     responses:
 *       200:
 *         description: Database status information
 */
router.get('/database/status', async (req: Request, res: Response<ApiResponse<DatabaseStatsData>>, next: NextFunction) => {
  try {
    // Get basic database statistics
    const categories = await dataService.getCategories();
    const parameters = await dataService.getParameters(); 
    const content = await dataService.getRecentContent(1000);
    const settings = await dataService.getSettings();
    
    const stats = {
      status: 'connected',
      statistics: {
        categories: categories.length,
        parameters: parameters.length,
        generatedContent: content.length,
        settings: Object.keys(settings).length
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Database status retrieved successfully',
      data: stats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Failed to retrieve database status', error));
  }
});

// ==================== API DOCUMENTATION ====================

/**
 * @swagger
 * /api/system/docs.json:
 *   get:
 *     summary: Get OpenAPI specification as JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 */
router.get('/docs.json', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate API documentation',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/docs:
 *   get:
 *     summary: Interactive API documentation (Swagger UI)
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI interface
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/docs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Setup Swagger UI with custom configuration
    const swaggerUiOptions = {
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #2c5aa0; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
      `,
      customSiteTitle: 'SpecGen API Documentation',
      swaggerOptions: {
        url: '/api/system/docs.json',
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        defaultModelRendering: 'model',
        displayRequestDuration: true,
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true
      }
    };
    
    const swaggerUIMiddleware = swaggerUi.setup(swaggerSpec, swaggerUiOptions);
    swaggerUIMiddleware(req, res, next);
  } catch (error: any) {
    next(boom.internal('Failed to load API documentation', error));
  }
});

// Serve Swagger UI assets
router.use('/docs', swaggerUi.serve);

export default router;