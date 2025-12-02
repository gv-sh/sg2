/**
 * SpecGen Middleware - Validation schemas, error handlers, and middleware configuration
 */

import { z, ZodError } from 'zod';
import boom from '@hapi/boom';
import pino from 'pino';
import swaggerJsdoc from 'swagger-jsdoc';
import { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== LOGGER ====================

export const logger = pino({
  level: config.get('logging.level')
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

// Content generation schemas - category-grouped parameters
export const generationRequestSchema = z.object({
  parameters: z.record(z.record(z.any())).default({}), // { "Category Name": { "param": value } }
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
});

// Parameter validation function - validates against database parameters
export async function validateGenerationParameters(parameters: Record<string, any>): Promise<{ isValid: boolean; errors: string[] }> {
  const { dataService } = await import('./services.js');
  const errors: string[] = [];
  
  try {
    // Get all parameters from database
    const dbParameters = await dataService.getParameters();
    const parameterMap = new Map(dbParameters.map(p => [p.id, p]));
    
    // Validate each submitted parameter
    for (const [paramId, value] of Object.entries(parameters)) {
      const dbParam = parameterMap.get(paramId);
      
      if (!dbParam) {
        errors.push(`Parameter '${paramId}' is not valid`);
        continue;
      }
      
      // Type-specific validation
      switch (dbParam.type) {
        case 'select':
          if (dbParam.parameter_values && Array.isArray(dbParam.parameter_values)) {
            const validValues = dbParam.parameter_values.map((v: any) => v.id || v.label);
            if (!validValues.includes(value)) {
              errors.push(`Parameter '${paramId}' must be one of: ${validValues.join(', ')}`);
            }
          }
          break;
        case 'text':
          if (typeof value !== 'string') {
            errors.push(`Parameter '${paramId}' must be a string`);
          } else if (value.length === 0) {
            errors.push(`Parameter '${paramId}' cannot be empty`);
          } else if (value.length > 200) {
            errors.push(`Parameter '${paramId}' cannot exceed 200 characters`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Parameter '${paramId}' must be a valid number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Parameter '${paramId}' must be a boolean (true/false)`);
          }
          break;
        case 'range':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Parameter '${paramId}' must be a valid number`);
          } else if (dbParam.parameter_config) {
            const config = dbParam.parameter_config;
            if (config.min !== undefined && value < config.min) {
              errors.push(`Parameter '${paramId}' must be at least ${config.min}`);
            }
            if (config.max !== undefined && value > config.max) {
              errors.push(`Parameter '${paramId}' must be at most ${config.max}`);
            }
          }
          break;
      }
    }
    
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    return { isValid: false, errors: ['Failed to validate parameters against database'] };
  }
}

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


// Common param schemas
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
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
  apis: [
    './routes/admin.ts',
    './routes/content.ts', 
    './routes/system.ts',
    './routes/index.ts'
  ]
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
export const jsonParsingErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return next(boom.badRequest('Invalid JSON payload'));
  }
  return next(error);
};

// Validation error handler
export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ZodError) {
    const boomError = boom.badRequest('Validation failed');
    boomError.output.payload.details = error.issues;
    return next(boomError);
  }
  return next(error);
};

// Boom error handler
export const boomErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (boom.isBoom(error)) {
    logger.error({
      error: error.message,
      statusCode: error.output.statusCode,
      method: req.method,
      url: req.url
    });
    
    const response: any = {
      success: false,
      error: error.output.payload.message,
    };
    
    // Include details if available (for validation errors)
    if (error.output.payload.details) {
      response.details = error.output.payload.details;
    }
    
    if (config.isDevelopment()) {
      response.stack = error.stack;
    }
    
    return res.status(error.output.statusCode).json(response);
  }
  return next(error);
};

// Generic error handler
export const genericErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  });

  const response: any = {
    success: false,
    error: 'Internal Server Error',
  };
  
  if (config.isDevelopment()) {
    response.stack = error.stack;
  }
  
  return res.status(500).json(response);
};

