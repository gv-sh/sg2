/**
 * SpecGen Middleware - Validation schemas, error handlers, and middleware configuration
 */

import { z, ZodError } from 'zod';
import boom from '@hapi/boom';
import pino from 'pino';
import swaggerJsdoc from 'swagger-jsdoc';
import { Request, Response, NextFunction } from 'express';
import config from './config.js';

// ==================== LOGGER ====================

export const logger = pino({
  level: config.get('logging.level'),
  transport: config.isDevelopment() ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// ==================== VALIDATION SCHEMAS ====================

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default('')
});

export const categoryUpdateSchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Parameter schemas
const parameterValueSchema = z.object({
  label: z.string(),
  id: z.string().optional()
});

const parameterConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional()
});

export const parameterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default(''),
  type: z.enum(['select', 'text', 'number', 'boolean', 'range']),
  category_id: z.string().min(1, 'Category ID is required'),
  parameter_values: z.union([
    z.array(parameterValueSchema),
    z.object({ on: z.string(), off: z.string() })
  ]).optional()
});

export const parameterUpdateSchema = parameterSchema.partial().omit({ category_id: true });

// Content generation schemas
export const generationRequestSchema = z.object({
  parameters: z.record(z.any()).default({}),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
});

export const contentUpdateSchema = z.object({
  title: z.string().min(1).max(config.get('validation.maxTitleLength')).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Query schemas
export const contentFiltersSchema = z.object({
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(config.get('validation.maxPageSize'))).default('20'),
  type: z.string().optional()
});

export const parameterFiltersSchema = z.object({
  categoryId: z.string().optional()
});

export const settingsSchema = z.record(z.any());

// Common param schemas
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

export const yearParamSchema = z.object({
  year: z.string().transform(val => parseInt(val)).pipe(z.number().int())
});

// ==================== SWAGGER DOCUMENTATION ====================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.get('docs.swagger.title'),
      version: config.get('docs.swagger.version'),
      description: config.get('docs.swagger.description'),
      contact: { name: 'SpecGen Support' }
    },
    servers: [
      {
        url: config.getSwaggerServer(),
        description: config.isProduction() ? 'Production server' : 'Development server'
      }
    ],
    tags: [
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Content', description: 'Content generation and management' },
      { name: 'System', description: 'System operations and monitoring' }
    ]
  },
  apis: ['./routes.js', './server.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==================== REQUEST LOGGING MIDDLEWARE ====================

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

// ==================== ERROR HANDLING MIDDLEWARE ====================

// JSON parsing error handler
export const jsonParsingErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof SyntaxError && 'body' in error) {
    return next(boom.badRequest('Invalid JSON payload'));
  }
  next(error);
};

// Validation error handler
export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof ZodError) {
    const boomError = boom.badRequest('Validation failed');
    boomError.output.payload.details = error.issues;
    return next(boomError);
  }
  next(error);
};

// Boom error handler
export const boomErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (boom.isBoom(error)) {
    logger.error({
      error: error.message,
      statusCode: error.output.statusCode,
      method: req.method,
      url: req.url
    });
    
    return res.status(error.output.statusCode).json({
      success: false,
      error: error.output.payload.message,
      ...(config.isDevelopment() && { 
        stack: error.stack
      }),
      ...(error.output.payload.details && { 
        details: error.output.payload.details 
      })
    });
  }
  next(error);
};

// Generic error handler
export const genericErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error({
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(config.isDevelopment() && { 
      stack: error.stack 
    })
  });
};

// ==================== HELPER FUNCTIONS ====================

// 404 handler for API routes
export const apiNotFoundHandler = (req: Request, res: Response): Response | null => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/api/admin', '/api/content', '/api/system']
    });
  }
  // Let it pass through to static file handler
  return null;
};