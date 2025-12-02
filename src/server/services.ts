/**
 * Consolidated Services for SpecGen Server
 * Merges dataService and AI service into a single module
 */

import sqlite3 from 'sqlite3';
import axios, { AxiosResponse } from 'axios';
import boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import config from './config.js';
import schema from './schema.js';
import type {
  DatabaseResult,
  Category,
  Parameter,
  GeneratedContent,
  Setting,
  CategoryData,
  ParameterData,
  ContentData,
  AIGenerationParameters,
  FictionGenerationResult,
  ImageGenerationResult,
  CombinedGenerationResult,
  OpenAIChatResponse,
  OpenAIImageResponse,
  VisualPatterns,
  ProcessedImageData
} from '../types/services.js';


// Visual elements patterns for image generation
const VISUAL_PATTERNS: VisualPatterns = {
  characters: [
    /(Dr\.|Professor|Captain|Agent|Detective|Pandit|Guru|Swami)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(Arjun|Priya|Raj|Kavya|Dev|Meera|Ravi|Anita|Vikram|Shreya)\s+(?:stood|walked|ran|sat|looked|gazed)/gi
  ],
  locations: [
    /(in|at|on|through)\s+(the\s+)?([A-Z][a-z\s]{3,30}(?:city|planet|station|facility|temple|palace))/gi,
    /(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Hyderabad)/gi
  ],
  objects: [
    /(advanced|alien|ancient|glowing|metallic|golden)\s+(scanner|device|weapon|helmet|artifact|tabla|sitar)/gi
  ],
  atmosphere: [
    /(red|blue|green|golden|silver|purple|saffron)\s+(light|glow|mist|sky|flame)/gi
  ]
};

/**
 * Data Service - Handles all database operations
 */
class DataService {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = config.getDatabasePath();
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure the database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(boom.internal('Failed to connect to database', err));
        } else {
          try {
            this.db!.run('PRAGMA foreign_keys = ON');
            await this.ensureSchema();
            await this.importJsonDataIfNeeded();
            resolve();
          } catch (initError) {
            reject(initError);
          }
        }
      });
    });
  }

  /**
   * Ensure database schema exists
   */
  private async ensureSchema(): Promise<void> {
    // Check if tables exist
    const tableCheck = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    );
    
    if (!tableCheck) {
      // Create all tables
      await this.createDatabaseSchema();
    }
  }

  /**
   * Create complete database schema using schema.js
   */
  private async createDatabaseSchema(): Promise<void> {
    console.log('Creating database schema from schema.js...');

    // Get all SQL statements from schema
    const statements = schema.getSchemaInitSQL();

    // Execute each statement
    for (const sql of statements) {
      await this.run(sql);
    }

    console.log('✅ Database schema created successfully');
  }

  /**
   * Import JSON data if database is empty and JSON files exist
   */
  private async importJsonDataIfNeeded(): Promise<void> {
    try {
      // Check if categories exist
      const existingCategories = await this.query('SELECT COUNT(*) as count FROM categories');
      
      if (existingCategories[0].count === 0) {
        console.log('Database is empty, attempting JSON data import...');
        await this.importJsonData();
      }
    } catch {
      // If there's an error, it might be that tables don't exist yet
      console.log('Skipping JSON import (tables may not exist yet)');
    }
  }

  /**
   * Import data from JSON files
   */
  private async importJsonData(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Try to read JSON database file
      const jsonPath = path.resolve('./data/database.json');
      const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      
      console.log('Importing categories...');
      // Import categories
      for (const category of jsonData.categories || []) {
        await this.createCategory({
          id: category.id,
          name: category.name,
          description: category.description || ''
        });
      }

      console.log('Importing parameters...');
      // Import parameters
      for (const param of jsonData.parameters || []) {
        await this.createParameter({
          id: param.id,
          name: param.name,
          description: param.description || '',
          type: param.type === 'Dropdown' ? 'select' : param.type.toLowerCase() as any,
          category_id: param.categoryId,
          sort_order: param.sort_order || 0,
          parameter_values: param.values || param.parameter_values
        });
      }

      console.log('✅ JSON data import completed successfully');
      
    } catch (error: any) {
      console.log('No JSON data to import or import failed:', error.message);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(boom.internal(`Database query failed: ${sql}`, err));
        } else {
          resolve(rows);
        }
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(boom.internal(`Database operation failed: ${sql}`, err));
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(boom.internal(`Database query failed: ${sql}`, err));
        } else {
          resolve(row);
        }
      });
    });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const categories = await this.query(
      `SELECT * FROM categories ORDER BY name ASC`
    );
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: new Date(category.created_at)
    }));
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) throw boom.notFound(`Category with id ${id} not found`);
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: new Date(category.created_at)
    };
  }

  async createCategory(categoryData: CategoryData): Promise<Category> {
    const id = categoryData.id || this.generateId(categoryData.name);
    await this.run(
      `INSERT INTO categories (id, name, description)
       VALUES (?, ?, ?)`,
      [
        id,
        categoryData.name,
        categoryData.description || ''
      ]
    );
    return await this.getCategoryById(id);
  }

  async updateCategory(id: string, updates: Partial<CategoryData>): Promise<Category> {
    const existing = await this.getCategoryById(id);
    await this.run(
      `UPDATE categories SET name = ?, description = ? WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.description !== undefined ? updates.description : existing.description,
        id
      ]
    );
    return await this.getCategoryById(id);
  }

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.run('DELETE FROM categories WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Category with id ${id} not found`);
    return { success: true, message: 'Category deleted successfully' };
  }

  // Parameters
  async getParametersByCategory(categoryId: string): Promise<Parameter[]> {
    const parameters = await this.query(
      `SELECT * FROM parameters WHERE category_id = ? ORDER BY sort_order ASC, name ASC`,
      [categoryId]
    );
    return this.parseParameters(parameters);
  }

  async getParameters(): Promise<Parameter[]> {
    const parameters = await this.query(
      `SELECT p.*, c.name as category_name FROM parameters p 
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY c.name ASC, p.sort_order ASC, p.name ASC`
    );
    return this.parseParameters(parameters);
  }

  async getParameterById(id: string): Promise<Parameter> {
    const parameter = await this.get('SELECT * FROM parameters WHERE id = ?', [id]);
    if (!parameter) throw boom.notFound(`Parameter with id ${id} not found`);
    return this.parseParameters([parameter])[0];
  }

  async createParameter(parameterData: ParameterData): Promise<Parameter> {
    const id = parameterData.id || this.generateId(parameterData.name);
    await this.getCategoryById(parameterData.category_id); // Verify category exists
    
    await this.run(
      `INSERT INTO parameters (id, name, description, type, category_id, sort_order, parameter_values)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parameterData.name,
        parameterData.description || '',
        parameterData.type,
        parameterData.category_id,
        parameterData.sort_order || 0,
        parameterData.parameter_values ? JSON.stringify(parameterData.parameter_values) : null
      ]
    );
    return await this.getParameterById(id);
  }

  async updateParameter(id: string, updates: Partial<ParameterData>): Promise<Parameter> {
    const existing = await this.getParameterById(id);
    if (updates.category_id) await this.getCategoryById(updates.category_id);
    
    await this.run(
      `UPDATE parameters SET name = ?, description = ?, type = ?, category_id = ?, sort_order = ?, parameter_values = ? WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.description !== undefined ? updates.description : existing.description,
        updates.type || existing.type,
        updates.category_id || existing.category_id,
        updates.sort_order !== undefined ? updates.sort_order : existing.sort_order,
        updates.parameter_values ? JSON.stringify(updates.parameter_values) : (existing.parameter_values ? JSON.stringify(existing.parameter_values) : null),
        id
      ]
    );
    return await this.getParameterById(id);
  }

  async deleteParameter(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.run('DELETE FROM parameters WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Parameter with id ${id} not found`);
    return { success: true, message: 'Parameter deleted successfully' };
  }

  // Content
  async saveGeneratedContent(contentData: ContentData): Promise<GeneratedContent> {
    const id = uuidv4();

    await this.run(
      `INSERT INTO generated_content (id, title, fiction_content, image_blob, image_thumbnail, image_format, image_size_bytes, thumbnail_size_bytes, prompt_data, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        contentData.title,
        contentData.fiction_content,
        contentData.image_blob || null,
        contentData.image_thumbnail || null,
        contentData.image_format || 'png',
        contentData.image_size_bytes || 0,
        contentData.thumbnail_size_bytes || 0,
        JSON.stringify(contentData.prompt_data || {}),
        JSON.stringify(contentData.metadata || {})
      ]
    );
    return await this.getGeneratedContentById(id);
  }

  async getGeneratedContentById(id: string): Promise<GeneratedContent> {
    const content = await this.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    if (!content) throw boom.notFound(`Content with id ${id} not found`);
    return {
      ...content,
      prompt_data: JSON.parse(content.prompt_data),
      metadata: content.metadata ? JSON.parse(content.metadata) : null,
      created_at: new Date(content.created_at)
    };
  }

  async getGeneratedContentForApi(id: string): Promise<GeneratedContent> {
    const content = await this.get(
      'SELECT * FROM generated_content WHERE id = ?',
      [id]
    );
    if (!content) throw boom.notFound(`Content with id ${id} not found`);

    const result: GeneratedContent = {
      ...content,
      prompt_data: JSON.parse(content.prompt_data),
      metadata: content.metadata ? JSON.parse(content.metadata) : null,
      created_at: new Date(content.created_at)
    };

    // Add image URLs if we have BLOB data stored
    if (content.image_blob) {
      result.image_original_url = `/api/images/${id}/original`;
      result.image_thumbnail_url = `/api/images/${id}/thumbnail`;
    }

    return result;
  }

  async getRecentContent(limit = 20): Promise<GeneratedContent[]> {
    const content = await this.query(
      'SELECT * FROM generated_content ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return content.map(item => {
      const result: GeneratedContent = {
        ...item,
        prompt_data: JSON.parse(item.prompt_data),
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        created_at: new Date(item.created_at)
      };

      // Add image URLs if we have BLOB data stored
      if (item.image_blob) {
        result.image_original_url = `/api/images/${item.id}/original`;
        result.image_thumbnail_url = `/api/images/${item.id}/thumbnail`;
      }

      return result;
    });
  }

  async updateGeneratedContent(id: string, updates: { title?: string }): Promise<GeneratedContent> {
    const existing = await this.getGeneratedContentById(id);

    await this.run(
      'UPDATE generated_content SET title = ? WHERE id = ?',
      [
        updates.title || existing.title,
        id
      ]
    );
    return await this.getGeneratedContentById(id);
  }

  async deleteGeneratedContent(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.run('DELETE FROM generated_content WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Content with id ${id} not found`);
    return { success: true, message: 'Content deleted successfully' };
  }

  async getAvailableYears(): Promise<number[]> {
    const content = await this.query(
      'SELECT prompt_data FROM generated_content WHERE prompt_data IS NOT NULL'
    );

    const years = new Set<number>();
    content.forEach(item => {
      try {
        const promptData = JSON.parse(item.prompt_data);
        if (promptData.year) {
          years.add(promptData.year);
        }
      } catch (error) {
        // Skip invalid JSON
      }
    });

    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  }

  // Settings
  async getSetting(key: string): Promise<Setting> {
    const setting = await this.get('SELECT * FROM settings WHERE key = ?', [key]);
    if (!setting) throw boom.notFound(`Setting with key ${key} not found`);
    return this.parseSetting(setting);
  }

  async getSettings(): Promise<Record<string, any>> {
    const settings = await this.query('SELECT * FROM settings ORDER BY key ASC');
    const parsed: Record<string, any> = {};
    settings.forEach(setting => {
      const parsedSetting = this.parseSetting(setting);
      parsed[setting.key] = parsedSetting.value;
    });
    return parsed;
  }

  async setSetting(key: string, value: any, dataType: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<Setting> {
    const stringValue = this.stringifySettingValue(value, dataType);
    await this.run(
      `INSERT OR REPLACE INTO settings (key, value, data_type) VALUES (?, ?, ?)`,
      [key, stringValue, dataType]
    );
    return await this.getSetting(key);
  }

  // Utility methods
  generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private parseParameters(parameters: any[]): Parameter[] {
    return parameters.map(param => ({
      ...param,
      required: Boolean(param.required),
      parameter_values: param.parameter_values ? JSON.parse(param.parameter_values) : null,
      parameter_config: param.parameter_config ? JSON.parse(param.parameter_config) : null,
      created_at: new Date(param.created_at)
    }));
  }

  private parseSetting(setting: any): Setting {
    let value = setting.value;
    switch (setting.data_type) {
      case 'number': value = Number(setting.value); break;
      case 'boolean': value = setting.value === 'true'; break;
      case 'json': value = JSON.parse(setting.value); break;
    }
    return {
      ...setting,
      value
    };
  }

  private stringifySettingValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'json': return JSON.stringify(value);
      case 'boolean':
      case 'number': return String(value);
      default: return value;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve) => {
        this.db!.close(() => resolve());
      });
    }
  }
}

/**
 * AI Service - Handles OpenAI API interactions
 */
class AIService {
  private apiKey: string;
  private baseUrl: string;
  public isConfigured: boolean;

  constructor() {
    this.apiKey = config.get('ai.openai.apiKey');
    this.baseUrl = config.get('ai.openai.baseUrl');
    this.isConfigured = Boolean(this.apiKey);
  }

  async generate(parameters: AIGenerationParameters, year: number | null = null): Promise<CombinedGenerationResult> {
    if (!this.isConfigured) {
      throw boom.internal('OpenAI API key not configured');
    }

    return this.generateCombined(parameters, year);
  }

  async generateFiction(parameters: AIGenerationParameters, year: number | null): Promise<FictionGenerationResult> {
    const aiConfig = config.getAIConfig('fiction') as any;
    const prompt = this.buildFictionPrompt(parameters, year);
    
    try {
      const response: AxiosResponse<OpenAIChatResponse['data']> = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: aiConfig.model,
          messages: [
            { role: 'system', content: aiConfig.parameters.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig.parameters.temperature,
          max_tokens: aiConfig.parameters.maxTokens
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const content = response.data.choices[0].message.content;
      const title = this.extractTitle(content);
      const wordCount = content.split(/\s+/).length;

      return {
        success: true,
        title,
        content,
        type: 'fiction',
        wordCount,
        metadata: {
          model: response.data.model,
          tokens: response.data.usage.total_tokens
        }
      };
    } catch (error) {
      throw boom.internal('Fiction generation failed', error);
    }
  }

  async generateImage(year: number | null, generatedText: string | null = null): Promise<ImageGenerationResult> {
    const aiConfig = config.getAIConfig('image') as any;
    const prompt = this.buildImagePrompt(year, generatedText);
    
    try {
      const response: AxiosResponse<OpenAIImageResponse['data']> = await axios.post(
        `${this.baseUrl}/images/generations`,
        {
          model: aiConfig.model,
          prompt: prompt.substring(0, 4000),
          size: aiConfig.parameters.size,
          quality: aiConfig.parameters.quality,
          n: 1
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const imageUrl = response.data.data[0].url;
      
      // Always download and store image data
      const imageData = await this.downloadImage(imageUrl);
      return {
        success: true,
        imageBlob: imageData.buffer,
        imageFormat: imageData.format,
        imageSizeBytes: imageData.size,
        imagePrompt: prompt.substring(0, 100) + '...',
        type: 'image',
        metadata: {
          model: aiConfig.model,
          prompt: prompt.substring(0, 100) + '...',
          originalSize: imageData.size
        }
      };
    } catch (error) {
      throw boom.internal('Image generation failed', error);
    }
  }

  async generateCombined(parameters: AIGenerationParameters, year: number | null): Promise<CombinedGenerationResult> {
    const fictionResult = await this.generateFiction(parameters, year);
    if (!fictionResult.success) return fictionResult as any;

    const imageResult = await this.generateImage(year, fictionResult.content);
    if (!imageResult.success) return imageResult as any;

    // Handle both BLOB and URL responses
    const result: CombinedGenerationResult = {
      success: true,
      title: fictionResult.title,
      content: fictionResult.content,
      imagePrompt: imageResult.imagePrompt,
      wordCount: fictionResult.wordCount,
      metadata: {
        fiction: fictionResult.metadata,
        image: imageResult.metadata
      }
    };

    // Add image data
    if (imageResult.imageBlob) {
      result.imageBlob = imageResult.imageBlob;
      result.imageFormat = imageResult.imageFormat;
      result.imageSizeBytes = imageResult.imageSizeBytes;
    }

    return result;
  }

  private buildFictionPrompt(parameters: AIGenerationParameters, year: number | null): string {
    let prompt = 'Create a compelling speculative fiction story with the following elements:\n\n';
    
    if (year) prompt += `Setting: Year ${year}\n\n`;
    
    // Handle category-grouped parameters
    Object.entries(parameters).forEach(([categoryName, categoryParams]) => {
      if (typeof categoryParams === 'object' && categoryParams !== null) {
        const paramEntries = Object.entries(categoryParams);
        if (paramEntries.length > 0) {
          prompt += `${categoryName}:\n`;
          
          paramEntries.forEach(([paramId, value]) => {
            if (value !== null && value !== undefined) {
              const paramName = this.formatParameterName(paramId);
              const displayValue = this.formatParameterValue(paramId, value);
              prompt += `- ${paramName}: ${displayValue}\n`;
            }
          });
          
          prompt += '\n';
        }
      }
    });
    
    prompt += 'Write a story that incorporates these elements naturally. Include a compelling title.';
    return prompt;
  }

  private formatParameterName(paramId: string): string {
    return paramId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatParameterValue(paramId: string, value: any): string {
    // Handle range parameters with descriptive labels
    if (paramId === 'technology-level') {
      if (value <= 0.2) return `Primitive (${value})`;
      if (value <= 0.4) return `Basic (${value})`;
      if (value <= 0.6) return `Moderate (${value})`;
      if (value <= 0.8) return `Advanced (${value})`;
      return `Highly Advanced (${value})`;
    }
    
    if (paramId === 'conflict-intensity') {
      if (value <= 0.2) return `Peaceful (${value})`;
      if (value <= 0.4) return `Low (${value})`;
      if (value <= 0.6) return `Moderate (${value})`;
      if (value <= 0.8) return `High (${value})`;
      return `Extreme (${value})`;
    }
    
    // Handle boolean parameters
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle select parameters - try to capitalize first letter
    if (typeof value === 'string') {
      // Convert kebab-case to title case
      return value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Return as-is for numbers and other types
    return String(value);
  }

  private buildImagePrompt(year: number | null, generatedText: string | null): string {
    const aiConfig = config.getAIConfig('image') as any;
    let prompt = 'Create a beautiful, detailed image';
    
    if (generatedText) {
      const visualElements = this.extractVisualElements(generatedText);
      if (visualElements.length > 0) {
        prompt += ` showing: ${visualElements.join(', ')}`;
      }
    }
    
    if (year) prompt += ` Set in year ${year}.`;
    prompt += ` ${aiConfig.parameters.promptSuffix}`;
    
    return prompt;
  }

  private extractVisualElements(text: string): string[] {
    const elements: string[] = [];
    const cleanText = text.replace(/\*\*Title:.*?\*\*/g, '').trim();
    
    Object.values(VISUAL_PATTERNS).forEach((patterns: RegExp[]) => {
      patterns.forEach((pattern: RegExp) => {
        const matches = cleanText.match(pattern) || [];
        matches.slice(0, 2).forEach(match => {
          const cleaned = match.replace(/\s+(stood|walked|ran|sat|looked|gazed).*$/i, '').trim();
          if (cleaned.length > 2 && cleaned.length < 50) {
            elements.push(cleaned);
          }
        });
      });
    });
    
    return [...new Set(elements)].slice(0, 5);
  }

  private async downloadImage(imageUrl: string): Promise<{ buffer: Buffer; format: string; size: number }> {
    try {
      // Download the image from DALL-E URL
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Detect format from content-type header or default to png
      const contentType = response.headers['content-type'] || '';
      let format = 'png';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        format = 'jpeg';
      } else if (contentType.includes('webp')) {
        format = 'webp';
      }
      
      return {
        buffer,
        format,
        size: buffer.length
      };
    } catch (error) {
      throw boom.internal('Failed to download image', error);
    }
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/\*\*Title:\s*([^*\n]+)\*\*/);
    if (titleMatch) return titleMatch[1].trim();
    
    const firstLine = content.split('\n')[0];
    if (firstLine.length < 100) {
      return firstLine.replace(/^\*\*|\*\*$/g, '').trim();
    }
    
    return `Fiction ${new Date().toISOString().slice(0, 10)}`;
  }
}

// Export singleton instances
export const dataService = new DataService();
export const aiService = new AIService();
export default { dataService, aiService };