/**
 * System Routes - Health checks, database management, and API documentation
 */

import express, { Request, Response, NextFunction } from 'express';
import boom from '@hapi/boom';
import swaggerUi from 'swagger-ui-express';

import config from '../config.js';
import { dataService } from '../services.js';
import { swaggerSpec, uploadMiddleware } from '../middleware.js';
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

// ==================== DATABASE MANAGEMENT ====================

/**
 * @swagger
 * /api/system/database/init:
 *   post:
 *     summary: Initialize database with default data
 *     tags: [System]
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
 * /api/system/database/export:
 *   get:
 *     summary: Export entire database as JSON
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/database/export', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const databaseData = await dataService.exportDatabase();
    
    res.json({
      success: true,
      message: 'Database exported successfully',
      data: databaseData,
      meta: {
        exportedAt: new Date().toISOString(),
        tables: Object.keys(databaseData)
      }
    });
  } catch (error: any) {
    next(boom.internal('Database export failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/import:
 *   post:
 *     summary: Import database from JSON file
 *     tags: [System]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON file containing database data
 *     responses:
 *       200:
 *         description: Database imported successfully
 */
router.post('/database/import', uploadMiddleware.single('file'), async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    // File upload will be handled by multer middleware
    if (!req.file) {
      return next(boom.badRequest('No file uploaded'));
    }

    const fileContent = req.file.buffer.toString('utf8');
    let databaseData;
    
    try {
      databaseData = JSON.parse(fileContent);
    } catch (parseError) {
      return next(boom.badRequest('Invalid JSON file'));
    }

    await dataService.importDatabase(databaseData);
    
    res.json({
      success: true,
      message: 'Database imported successfully',
      meta: {
        importedAt: new Date().toISOString(),
        filename: req.file.originalname,
        fileSize: req.file.size
      }
    });
  } catch (error: any) {
    console.error('Database import error details:', error);
    next(boom.internal('Database import failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/reset:
 *   post:
 *     summary: Reset database to initial state
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database reset successfully
 */
router.post('/database/reset', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    await dataService.resetDatabase();
    
    res.json({
      success: true,
      message: 'Database reset successfully',
      meta: {
        resetAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Database reset failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/export/content:
 *   get:
 *     summary: Export only generated content as JSON
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Content exported successfully
 */
router.get('/database/export/content', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const contentData = await dataService.exportContent();
    
    res.json({
      success: true,
      message: 'Content exported successfully',
      data: contentData,
      meta: {
        exportedAt: new Date().toISOString(),
        contentCount: contentData.length
      }
    });
  } catch (error: any) {
    next(boom.internal('Content export failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/reset/content:
 *   post:
 *     summary: Clear only generated content
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Content cleared successfully
 */
router.post('/database/reset/content', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const result = await dataService.resetContent();
    
    res.json({
      success: true,
      message: 'Content cleared successfully',
      data: result,
      meta: {
        clearedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    next(boom.internal('Content reset failed', error));
  }
});

/**
 * @swagger
 * /api/system/database/status:
 *   get:
 *     summary: Get database statistics and status
 *     tags: [System]
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
 *     tags: [System]
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

// Serve Swagger UI assets first
router.use('/docs', swaggerUi.serve);

/**
 * @swagger
 * /api/system/docs:
 *   get:
 *     summary: Interactive API documentation (Swagger UI)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Swagger UI interface
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/docs', swaggerUi.setup(swaggerSpec, {
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
}));

export default router;