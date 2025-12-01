/**
 * SpecGen Server - Main Express Application
 * Coordinates middleware, routes, and server startup
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';

import config from './config.js';
import routes from './routes/index.js';
import {
  logger,
  requestLoggingMiddleware,
  jsonParsingErrorHandler,
  validationErrorHandler,
  boomErrorHandler,
  genericErrorHandler
} from './middleware.js';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Express app
const app: express.Application = express();
const PORT = config.get('server.port');

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.get('security.rateLimiting.windowMs'),
  max: config.get('security.rateLimiting.maxRequests'),
  message: { 
    success: false, 
    error: 'Too many requests, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

if (config.isFeatureEnabled('enableRateLimit')) {
  app.use('/api/', limiter);
}

// CORS configuration
app.use(cors({
  origin: config.getCorsOrigins(),
  credentials: true
}));

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: config.get('server.bodyLimit') }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLoggingMiddleware);

// ==================== MOUNT ROUTES ====================

app.use(routes);

// ==================== ERROR HANDLING ====================

app.use(jsonParsingErrorHandler);
app.use(validationErrorHandler);
app.use(boomErrorHandler);
app.use(genericErrorHandler);

// ==================== STATIC FILE SERVING ====================

// Serve static files from React build
const buildPath = path.join(__dirname, '..', '..', 'build');
app.use(express.static(buildPath));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/api/admin', '/api/content', '/api/system']
    });
  }
  
  return res.sendFile(path.join(buildPath, 'index.html'));
});

// ==================== SERVER STARTUP ====================

// Declare server variable for type checking
let server: Server;

// Graceful shutdown handler
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, config.get('server.timeouts.gracefulShutdown'));
};

// Start server
server = app.listen(PORT, () => {
  logger.info({
    message: 'SpecGen API Server started',
    port: PORT,
    environment: config.get('env'),
    docs: `http://localhost:${PORT}/api/system/docs`
  });
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error({
    message: 'Unhandled Promise Rejection',
    reason: reason,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error({
    message: 'Uncaught Exception',
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

export default app;