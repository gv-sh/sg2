/**
 * Configuration Type Definitions
 * Types for application configuration and settings
 */

export interface ServerConfig {
  port: number;
  host: string;
  timeouts: {
    gracefulShutdown: number;
    request: number;
  };
  bodyLimit: string;
}

export interface SecurityConfig {
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: {
      development: string[];
      production: string[];
      test: string[];
    };
    credentials: boolean;
  };
  helmet: {
    crossOriginEmbedderPolicy: boolean;
    contentSecurityPolicy: boolean;
  };
}

export interface DatabaseConfig {
  type: string;
  sqlite: {
    path: string;
    testPath: string;
  };
  options: {
    connectionTimeout: number;
    busyTimeout: number;
  };
}

export interface AIConfig {
  openai: {
    apiKey: string;
    baseUrl: string;
  };
  models: {
    fiction: string;
    image: string;
  };
  parameters: {
    fiction: {
      temperature: number;
      maxTokens: number;
      defaultStoryLength: number;
      systemPrompt: string;
    };
    image: {
      size: string;
      quality: string;
      promptSuffix: string;
    };
  };
}

export interface BusinessConfig {
  years: { min: number; max: number };
  pagination: { defaultLimit: number; maxLimit: number; minLimit: number };
  content: { defaultType: string; idRandomMultiplier: number };
}

export interface LoggingConfig {
  level: string;
  prettyPrint: boolean;
  colorize: boolean;
}

export interface DocsConfig {
  swagger: {
    title: string;
    version: string;
    description: string;
    servers: {
      development: string;
      production: string;
      test: string;
    };
  };
}

export interface FeaturesConfig {
  enableMetrics: boolean;
  enableCache: boolean;
  enableRateLimit: boolean;
}

export interface ValidationConfig {
  maxNameLength: number;
  maxDescriptionLength: number;
  maxTitleLength: number;
  maxContentLength: number;
  maxPromptLength: number;
  maxParametersPerRequest: number;
  maxSettingsKeys: number;
  maxPageSize: number;
  defaultPageSize: number;
  yearRange: { min: number; max: number };
}

export interface AppConfig {
  name: string;
  version: string;
  description: string;
}

export interface Config {
  env: string;
  app: AppConfig;
  server: ServerConfig;
  security: SecurityConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  business: BusinessConfig;
  logging: LoggingConfig;
  docs: DocsConfig;
  features: FeaturesConfig;
  validation: ValidationConfig;
}