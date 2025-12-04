/**
 * Main Routes Index - Aggregates all route modules
 */

import express, { Request, Response } from 'express';
import config from '../config.js';

// Import route modules
import adminRoutes from './admin.js';
import contentRoutes from './content.js';
import systemRoutes from './system.js';

const router: express.Router = express.Router();

// ==================== API INFO ====================

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information and available endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 */
router.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SpecGen API Server',
    data: {
      name: config.get('app.name'),
      version: config.get('app.version'),
      description: config.get('app.description'),
      environment: config.get('env'),
      timestamp: new Date().toISOString(),
      endpoints: {
        admin: {
          categories: '/api/admin/categories',
          parameters: '/api/admin/parameters',
          settings: '/api/admin/settings'
        },
        content: {
          generate: '/api/generate',
          list: '/api/content',
          summary: '/api/content/summary',
          years: '/api/content/years'
        },
        system: {
          health: '/api/system/health',
          docs: '/api/system/docs',
          database: '/api/system/database/status'
        }
      },
      documentation: {
        interactive: '/api/system/docs',
        openapi: '/api/system/docs.json'
      }
    },
    meta: {
      server: config.getSwaggerServer(),
      timestamp: new Date().toISOString()
    }
  });
});

// ==================== MOUNT SUB-ROUTES ====================

// Admin routes - categories, parameters, settings management
router.use('/api/admin', adminRoutes);

// Content routes - generation, management, and image serving
router.use('/api/content', contentRoutes);

// Mount specific content endpoints at different paths
router.post('/api/generate', (req, res, next) => {
  // Route the generate request to content routes
  req.url = '/generate';
  contentRoutes(req, res, next);
});

// Mount image routes directly from content routes
router.use('/api', contentRoutes);

// User-facing data endpoints
router.get('/api/categories', (req, res, next) => {
  // Route categories request to content routes
  req.url = '/categories';
  contentRoutes(req, res, next);
});

router.get('/api/parameters', (req, res, next) => {
  // Route parameters request to content routes
  req.url = '/parameters';
  contentRoutes(req, res, next);
});

// System routes - health, database, documentation  
router.use('/api/system', systemRoutes);

export default router;