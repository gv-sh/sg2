/**
 * API Type Definitions
 * Types for API requests, responses, and route handlers
 */

import { Request } from 'express';

// Express route handler types
export interface TypedRequestParams<T extends Record<string, string> = Record<string, string>> extends Request {
  params: T;
}

export interface TypedRequestBody<T = any> extends Request {
  body: T;
}

export interface TypedRequestQuery<T extends Record<string, any> = Record<string, any>> extends Request {
  query: T;
}

export interface TypedRequest<P extends Record<string, string> = Record<string, string>, B = any, Q extends Record<string, any> = Record<string, any>> extends Request {
  params: P;
  body: B;
  query: Q;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
  meta?: Record<string, any>;
}

// Content types
export interface ContentApiData {
  id: string;
  title: string;
  content: string;
  type: 'fiction' | 'image' | 'combined';
  image_original_url?: string;
  image_thumbnail_url?: string;
  parameters: Record<string, any>;
  year: number | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface HealthStatusData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory?: {
    used: number;
    total: number;
    external: number;
  };
  database: {
    connected: boolean;
    message?: string;
  };
  ai: {
    configured: boolean;
    model: string;
  };
  features?: {
    rateLimiting: boolean;
    cache: boolean;
    metrics: boolean;
  };
}

export interface DatabaseStatsData {
  status: string;
  statistics: {
    categories: number;
    parameters: number;
    generatedContent: number;
    settings: number;
  };
  timestamp: string;
}