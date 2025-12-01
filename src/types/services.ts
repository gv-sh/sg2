/**
 * Service Type Definitions
 * Types for data models, service interfaces, and AI operations
 */

export interface DatabaseResult {
  lastID: number;
  changes: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  visibility?: string;
  sort_order: number;
  created_at: Date;
}

export interface Parameter {
  id: string;
  name: string;
  description: string;
  type: 'select' | 'text' | 'number' | 'boolean' | 'range';
  category_id: string;
  category_name?: string;
  visibility?: string;
  required: boolean;
  sort_order: number;
  parameter_values: any[] | null;
  parameter_config: Record<string, any> | null;
  created_at: Date;
}

export interface GeneratedContent {
  id: string;
  title: string;
  fiction_content: string;
  image_blob?: Buffer | null;
  image_thumbnail?: Buffer | null;
  image_format: string;
  image_size_bytes: number;
  thumbnail_size_bytes: number;
  prompt_data: Record<string, any>;
  metadata: Record<string, any> | null;
  created_at: Date;
  image_original_url?: string;
  image_thumbnail_url?: string;
}

export interface Setting {
  key: string;
  value: any;
  data_type: 'string' | 'number' | 'boolean' | 'json';
}

export interface CategoryData {
  id?: string;
  name: string;
  description?: string;
  sort_order?: number;
}

export interface ParameterData {
  id?: string;
  name: string;
  description?: string;
  type: 'select' | 'text' | 'number' | 'boolean' | 'range';
  category_id: string;
  sort_order?: number;
  parameter_values?: any[] | { on: string; off: string };
}

export interface ContentData {
  title: string;
  fiction_content: string;
  image_blob?: Buffer | null;
  image_thumbnail?: Buffer | null;
  image_format?: string;
  image_size_bytes?: number;
  thumbnail_size_bytes?: number;
  prompt_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AIGenerationParameters {
  [category: string]: {
    [parameter: string]: any;
  } | any;
}

export interface FictionGenerationResult {
  success: boolean;
  title: string;
  content: string;
  type: 'fiction';
  wordCount: number;
  metadata: {
    model: string;
    tokens: number;
  };
}

export interface ImageGenerationResult {
  success: boolean;
  imageBlob?: Buffer;
  imageThumbnail?: Buffer;
  imageFormat?: string;
  imageSizeBytes?: number;
  thumbnailSizeBytes?: number;
  imageUrl?: string;
  imagePrompt: string;
  type: 'image';
  metadata: {
    model: string;
    prompt: string;
    originalSize?: number;
    thumbnailSize?: number;
  };
}

export interface CombinedGenerationResult {
  success: boolean;
  title: string;
  content: string;
  imagePrompt: string;
  wordCount: number;
  imageBlob?: Buffer;
  imageThumbnail?: Buffer;
  imageFormat?: string;
  imageSizeBytes?: number;
  thumbnailSizeBytes?: number;
  error?: string;
  imageUrl?: string;
  metadata: {
    fiction: {
      model: string;
      tokens: number;
    };
    image: {
      model: string;
      prompt: string;
      originalSize?: number;
      thumbnailSize?: number;
    };
  };
}

export interface OpenAIChatResponse {
  data: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    model: string;
    usage: {
      total_tokens: number;
    };
  };
}

export interface OpenAIImageResponse {
  data: {
    data: Array<{
      url: string;
    }>;
  };
}

export interface VisualPatterns {
  characters: RegExp[];
  locations: RegExp[];
  objects: RegExp[];
  atmosphere: RegExp[];
}

export interface ProcessedImageData {
  original: Buffer;
  thumbnail: Buffer;
  format: string;
  originalSize: number;
  thumbnailSize: number;
}