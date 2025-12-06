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
  GenerationResult,
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
          category_id: param.category_id, // Use new format
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
      `SELECT c.*, COUNT(p.id) as parameter_count
       FROM categories c 
       LEFT JOIN parameters p ON c.id = p.category_id 
       GROUP BY c.id, c.name, c.description, c.created_at
       ORDER BY c.name ASC`
    );
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: new Date(category.created_at),
      parameter_count: category.parameter_count || 0
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
    // First check if category exists
    const existing = await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) throw boom.notFound(`Category with id ${id} not found`);
    
    // Check for dependent parameters (helpful for debugging)
    const dependentParams = await this.query('SELECT id, name FROM parameters WHERE category_id = ?', [id]);
    if (dependentParams.length > 0) {
      console.log(`Deleting category ${id} with ${dependentParams.length} dependent parameters:`, dependentParams.map(p => p.name));
    }
    
    // Ensure foreign keys are enabled for this connection
    await this.run('PRAGMA foreign_keys = ON');
    
    // Delete the category (CASCADE should handle parameters)
    const result = await this.run('DELETE FROM categories WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Category with id ${id} not found`);
    
    return { success: true, message: 'Category deleted successfully' };
  }

  // Parameters
  async getParametersByCategory(categoryId: string): Promise<Parameter[]> {
    const parameters = await this.query(
      `SELECT * FROM parameters WHERE category_id = ? ORDER BY name ASC`,
      [categoryId]
    );
    return this.parseParameters(parameters);
  }

  async getParameters(): Promise<Parameter[]> {
    const parameters = await this.query(
      `SELECT p.*, c.name as category_name FROM parameters p 
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY c.name ASC, p.name ASC`
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
      `INSERT INTO parameters (id, name, description, type, category_id, parameter_values, parameter_config)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parameterData.name,
        parameterData.description || '',
        parameterData.type,
        parameterData.category_id,
        parameterData.parameter_values ? JSON.stringify(parameterData.parameter_values) : null,
        (parameterData as any).parameter_config ? JSON.stringify((parameterData as any).parameter_config) : null
      ]
    );
    return await this.getParameterById(id);
  }

  async updateParameter(id: string, updates: Partial<ParameterData>): Promise<Parameter> {
    const existing = await this.getParameterById(id);
    if (updates.category_id) await this.getCategoryById(updates.category_id);
    
    // Determine the new type
    const newType = updates.type || existing.type;
    const isTypeChanging = updates.type && updates.type !== existing.type;
    
    // Handle parameter_values based on type changes
    let parameterValues: string | null;
    let parameterConfig: string | null;
    
    // Enhanced logic to handle type-value compatibility
    const shouldUseDefaults = isTypeChanging && (
      updates.parameter_values === undefined || 
      !this.isParameterValueCompatible(newType, updates.parameter_values)
    );
    
    if (shouldUseDefaults) {
      // Type is changing or incompatible values - initialize appropriate defaults
      switch (newType) {
        case 'select':
        case 'radio':
          // Initialize empty array for select/radio options
          parameterValues = JSON.stringify([]);
          break;
        case 'boolean':
          // Initialize default boolean labels
          parameterValues = JSON.stringify({ on: 'Yes', off: 'No' });
          break;
        case 'text':
          // Clear parameter_values for simple types
          parameterValues = null;
          break;
        case 'range':
          // Clear parameter_values for range (uses parameter_config instead)
          parameterValues = null;
          break;
        default:
          parameterValues = null;
      }
      
      console.log('Parameter update using type defaults:', { 
        id, 
        newType, 
        isTypeChanging,
        providedValues: updates.parameter_values,
        resultValues: parameterValues 
      });
      
    } else if (updates.parameter_values !== undefined) {
      // Explicitly provided parameter_values that are compatible
      parameterValues = updates.parameter_values ? JSON.stringify(updates.parameter_values) : null;
      
      console.log('Parameter update using provided values:', { 
        id, 
        newType, 
        providedValues: updates.parameter_values,
        resultValues: parameterValues 
      });
      
    } else {
      // No type change, no explicit parameter_values - keep existing
      parameterValues = existing.parameter_values ? JSON.stringify(existing.parameter_values) : null;
      
      console.log('Parameter update keeping existing values:', { 
        id, 
        newType, 
        existingValues: existing.parameter_values,
        resultValues: parameterValues 
      });
    }
    
    // Handle parameter_config for range parameters
    const updatesWithConfig = updates as any;
    const existingWithConfig = existing as any;
    
    if (updatesWithConfig.parameter_config !== undefined) {
      // Explicitly provided parameter_config
      parameterConfig = updatesWithConfig.parameter_config ? JSON.stringify(updatesWithConfig.parameter_config) : null;
    } else if (isTypeChanging) {
      // Type is changing - handle parameter_config
      if (newType === 'range') {
        // Initialize default range config if not provided
        parameterConfig = JSON.stringify({ min: 0, max: 100, step: 1 });
      } else {
        // Clear parameter_config for non-range types
        parameterConfig = null;
      }
    } else {
      // No type change, no explicit parameter_config - keep existing
      parameterConfig = existingWithConfig.parameter_config ? JSON.stringify(existingWithConfig.parameter_config) : null;
    }
    
    await this.run(
      `UPDATE parameters SET name = ?, description = ?, type = ?, category_id = ?, parameter_values = ?, parameter_config = ? WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.description !== undefined ? updates.description : existing.description,
        newType,
        updates.category_id || existing.category_id,
        parameterValues,
        parameterConfig,
        id
      ]
    );
    return await this.getParameterById(id);
  }

  /**
   * Check if parameter_values is compatible with the given parameter type
   */
  private isParameterValueCompatible(type: string, values: any): boolean {
    if (values === null || values === undefined) {
      return true; // null/undefined is always compatible (will be initialized)
    }

    switch (type) {
      case 'select':
      case 'radio':
        // Should be non-empty array with valid structure
        return Array.isArray(values) && 
               values.length > 0 && 
               values.every(v => v && typeof v.label === 'string');
        
      case 'boolean':
        // Should be object with 'on' and 'off' string properties
        return typeof values === 'object' && 
               !Array.isArray(values) &&
               typeof values.on === 'string' && 
               typeof values.off === 'string';
        
      case 'text':
      case 'range':
        // These types should not have parameter_values
        return values === null;
        
      default:
        return false;
    }
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

  async updateGeneratedContent(id: string, updates: { title?: string; metadata?: Record<string, any> }): Promise<GeneratedContent> {
    const existing = await this.getGeneratedContentById(id);

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updates.title);
    }

    if (updates.metadata !== undefined) {
      updateFields.push('metadata = ?');
      updateValues.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      // No updates provided, return existing
      return existing;
    }

    updateValues.push(id); // Add id for WHERE clause

    await this.run(
      `UPDATE generated_content SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
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

  // Database Management
  async exportDatabase(): Promise<any> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      },
      categories: await this.getCategories(),
      parameters: await this.getParameters(),
      settings: await this.getSettings(),
      generated_content: await this.getRecentContent(10000) // Get all content
    };

    // Remove database-specific fields and clean up data for export
    exportData.generated_content = exportData.generated_content.map(content => ({
      id: content.id,
      title: content.title,
      fiction_content: content.fiction_content,
      image_blob: content.image_blob,
      image_thumbnail: content.image_thumbnail,
      image_format: content.image_format,
      image_size_bytes: content.image_size_bytes,
      thumbnail_size_bytes: content.thumbnail_size_bytes,
      prompt_data: content.prompt_data,
      metadata: content.metadata,
      created_at: content.created_at
    }));

    return exportData;
  }

  async importDatabase(data: any): Promise<void> {
    if (!data || typeof data !== 'object') {
      throw boom.badRequest('Invalid database data format');
    }

    // Begin transaction-like operations (SQLite autocommit)
    try {
      // Clear existing data (except schema)
      await this.run('DELETE FROM generated_content');
      await this.run('DELETE FROM parameters');
      await this.run('DELETE FROM categories');
      await this.run('DELETE FROM settings');

      // Import categories
      if (data.categories && Array.isArray(data.categories)) {
        for (const category of data.categories) {
          await this.createCategory({
            id: category.id,
            name: category.name,
            description: category.description || ''
          });
        }
      }

      // Import parameters
      if (data.parameters && Array.isArray(data.parameters)) {
        for (const param of data.parameters) {
          await this.createParameter({
            id: param.id,
            name: param.name,
            description: param.description || '',
            type: param.type,
            category_id: param.category_id,
            parameter_values: param.parameter_values
          });
        }
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        for (const [key, value] of Object.entries(data.settings)) {
          // Determine data type
          let dataType: 'string' | 'number' | 'boolean' | 'json' = 'string';
          if (typeof value === 'number') dataType = 'number';
          else if (typeof value === 'boolean') dataType = 'boolean';
          else if (typeof value === 'object') dataType = 'json';

          await this.setSetting(key, value, dataType);
        }
      }

      // Import generated content
      if (data.generated_content && Array.isArray(data.generated_content)) {
        for (const content of data.generated_content) {
          await this.run(
            `INSERT INTO generated_content (id, title, fiction_content, image_blob, image_thumbnail, image_format, image_size_bytes, thumbnail_size_bytes, prompt_data, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              content.id,
              content.title,
              content.fiction_content,
              content.image_blob || null,
              content.image_thumbnail || null,
              content.image_format || 'png',
              content.image_size_bytes || 0,
              content.thumbnail_size_bytes || 0,
              JSON.stringify(content.prompt_data || {}),
              JSON.stringify(content.metadata || {}),
              content.created_at || new Date().toISOString()
            ]
          );
        }
      }

    } catch (error) {
      throw boom.internal('Database import failed', error);
    }
  }

  async resetDatabase(): Promise<void> {
    try {
      // Clear all data
      await this.run('DELETE FROM generated_content');
      await this.run('DELETE FROM parameters');  
      await this.run('DELETE FROM categories');
      await this.run('DELETE FROM settings');

      // Reimport default data from JSON if available
      await this.importJsonDataIfNeeded();
    } catch (error) {
      throw boom.internal('Database reset failed', error);
    }
  }

  async exportContent(): Promise<any[]> {
    const content = await this.getRecentContent(10000); // Get all content
    
    // Clean up data for export (remove database-specific fields)
    return content.map(item => ({
      id: item.id,
      title: item.title,
      fiction_content: item.fiction_content,
      image_blob: item.image_blob,
      image_thumbnail: item.image_thumbnail,
      image_format: item.image_format,
      image_size_bytes: item.image_size_bytes,
      thumbnail_size_bytes: item.thumbnail_size_bytes,
      prompt_data: item.prompt_data,
      metadata: item.metadata,
      created_at: item.created_at
    }));
  }

  async resetContent(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const result = await this.run('DELETE FROM generated_content');
      return {
        success: true,
        message: 'All generated content cleared successfully',
        deletedCount: result.changes || 0
      };
    } catch (error) {
      throw boom.internal('Content reset failed', error);
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

  async generate(parameters: AIGenerationParameters, year: number | null = null): Promise<GenerationResult> {
    if (!this.isConfigured) {
      throw boom.internal('OpenAI API key not configured');
    }

    return this.generateUnified(parameters, year);
  }

  /**
   * Load AI configuration from database settings with fallback to static config
   */
  private async getAISettingsConfig(type: 'fiction' | 'image') {
    try {
      const settings = await dataService.getSettings();
      const staticConfig = config.getAIConfig(type) as any;
      
      console.log('Loading AI settings for:', type);
      console.log('Database settings:', settings);
      console.log('Static config:', staticConfig);
      
      if (type === 'fiction') {
        return {
          model: settings['ai.models.fiction'] || staticConfig.model,
          parameters: {
            temperature: settings['ai.parameters.fiction.temperature'] !== undefined 
              ? Number(settings['ai.parameters.fiction.temperature']) 
              : staticConfig.parameters.temperature,
            maxTokens: settings['ai.parameters.fiction.max_tokens'] !== undefined 
              ? Number(settings['ai.parameters.fiction.max_tokens']) 
              : staticConfig.parameters.maxTokens,
            defaultStoryLength: settings['ai.parameters.fiction.default_story_length'] !== undefined 
              ? Number(settings['ai.parameters.fiction.default_story_length']) 
              : staticConfig.parameters.defaultStoryLength,
            systemPrompt: settings['ai.parameters.fiction.system_prompt'] || staticConfig.parameters.systemPrompt
          },
          apiKey: staticConfig.apiKey,
          baseUrl: staticConfig.baseUrl
        };
      } else {
        return {
          model: settings['ai.models.image'] || staticConfig.model,
          parameters: {
            size: settings['ai.parameters.image.size'] || staticConfig.parameters.size,
            quality: settings['ai.parameters.image.quality'] || staticConfig.parameters.quality,
            promptSuffix: settings['ai.parameters.image.prompt_suffix'] || staticConfig.parameters.promptSuffix
          },
          apiKey: staticConfig.apiKey,
          baseUrl: staticConfig.baseUrl
        };
      }
    } catch (error) {
      console.warn('Failed to load settings from database, using static config:', error);
      return config.getAIConfig(type) as any;
    }
  }

  async generateUnified(parameters: AIGenerationParameters, year: number | null): Promise<GenerationResult> {
    // Load dynamic settings from database
    const fictionConfig = await this.getAISettingsConfig('fiction');
    const fictionPrompt = this.buildFictionPrompt(parameters, year, fictionConfig.parameters.defaultStoryLength);
    
    let fictionContent: string;
    let fictionTitle: string; 
    let wordCount: number;
    let fictionMetadata: any;
    
    try {
      const fictionResponse: AxiosResponse<OpenAIChatResponse['data']> = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: fictionConfig.model,
          messages: [
            { role: 'system', content: fictionConfig.parameters.systemPrompt },
            { role: 'user', content: fictionPrompt }
          ],
          temperature: fictionConfig.parameters.temperature,
          max_tokens: fictionConfig.parameters.maxTokens
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const rawFictionContent = fictionResponse.data.choices[0].message.content;
      fictionTitle = this.extractTitle(rawFictionContent);
      fictionContent = this.removeTitle(rawFictionContent);
      wordCount = fictionContent.split(/\s+/).length;
      fictionMetadata = {
        model: fictionResponse.data.model,
        tokens: fictionResponse.data.usage.total_tokens
      };
    } catch (error: any) {
      console.error('Fiction generation error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: {
          model: fictionConfig.model,
          temperature: fictionConfig.parameters.temperature,
          max_tokens: fictionConfig.parameters.maxTokens,
          hasApiKey: !!this.apiKey
        }
      });
      throw boom.internal('Fiction generation failed', error);
    }

    // Generate image based on fiction content
    const imageConfig = await this.getAISettingsConfig('image');
    const imagePrompt = this.buildImagePrompt(year, fictionContent, imageConfig.parameters.promptSuffix);
    
    let imageBlob: Buffer | undefined;
    let imageFormat: string | undefined;
    let imageSizeBytes: number | undefined;
    let imageMetadata: any;

    try {
      // Build request payload based on model capabilities
      const requestPayload: any = {
        model: imageConfig.model,
        prompt: imagePrompt.substring(0, 4000),
        size: imageConfig.parameters.size,
        n: 1
      };

      // Add quality parameter for models that support it
      if (imageConfig.parameters.quality) {
        // DALL-E 3 uses 'standard'/'hd', while GPT-Image models use 'low'/'medium'/'high'
        if (imageConfig.model === 'dall-e-3') {
          requestPayload.quality = imageConfig.parameters.quality;
        } else if (imageConfig.model === 'gpt-image-1' || imageConfig.model === 'gpt-image-1-mini') {
          requestPayload.quality = imageConfig.parameters.quality;
        }
      }

      const imageResponse: AxiosResponse<OpenAIImageResponse['data']> = await axios.post(
        `${this.baseUrl}/images/generations`,
        requestPayload,
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const imageUrl = imageResponse.data.data[0].url;
      
      // Always download and store image data
      const imageData = await this.downloadImage(imageUrl);
      imageBlob = imageData.buffer;
      imageFormat = imageData.format;
      imageSizeBytes = imageData.size;
      imageMetadata = {
        model: imageConfig.model,
        prompt: imagePrompt.substring(0, 100) + '...',
        originalSize: imageData.size
      };
    } catch (error) {
      throw boom.internal('Image generation failed', error);
    }

    return {
      success: true,
      title: fictionTitle,
      content: fictionContent,
      imagePrompt: imagePrompt.substring(0, 100) + '...',
      wordCount,
      imageBlob,
      imageFormat,
      imageSizeBytes,
      metadata: {
        fiction: fictionMetadata,
        image: imageMetadata
      }
    };
  }

  private buildFictionPrompt(parameters: AIGenerationParameters, year: number | null, wordLimit: number): string {
    let prompt = 'Create a compelling speculative fiction story with the following elements:\n\n';
    
    if (year) prompt += `Setting: Year ${year}\n\n`;
    
    // Add word count constraint
    if (wordLimit && wordLimit > 0) {
      prompt += `Length: Write approximately ${wordLimit} words (this is important - do not exceed this word count)\n\n`;
    }
    
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
    
    prompt += `Write a story that incorporates these elements naturally. Include a compelling title.`;
    
    // Emphasize word limit again at the end
    if (wordLimit && wordLimit > 0) {
      prompt += ` Keep the story to approximately ${wordLimit} words - this is a strict requirement.`;
    }
    
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

  private buildImagePrompt(year: number | null, generatedText: string | null, promptSuffix: string): string {
    let prompt = 'Create a beautiful, detailed image';
    
    if (generatedText) {
      const visualElements = this.extractVisualElements(generatedText);
      if (visualElements.length > 0) {
        prompt += ` showing: ${visualElements.join(', ')}`;
      }
    }
    
    if (year) prompt += ` Set in year ${year}.`;
    prompt += ` ${promptSuffix}`;
    
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
    // Look for formal title patterns
    const titleMatch = content.match(/\*\*Title:\s*([^*\n]+)\*\*/);
    if (titleMatch) {
      return this.cleanTitle(titleMatch[1]);
    }
    
    const firstLine = content.split('\n')[0];
    if (firstLine.length < 100) {
      return this.cleanTitle(firstLine);
    }
    
    return `Fiction ${new Date().toISOString().slice(0, 10)}`;
  }

  private cleanTitle(title: string): string {
    return title
      // Remove markdown headers
      .replace(/^#{1,6}\s+/g, '')
      // Remove bold/italic formatting
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^\*|\*$/g, '')
      .replace(/^__\b|\b__$/g, '')
      .replace(/^_\b|\b_$/g, '')
      // Remove surrounding quotes
      .replace(/^"(.*)"$/g, '$1')
      .replace(/^'(.*)'$/g, '$1')
      .replace(/^"(.*)"$/g, '$1') // Smart quotes
      .replace(/^'(.*)'$/g, '$1') // Smart quotes
      // Clean up any remaining whitespace
      .trim();
  }

  private removeTitle(content: string): string {
    // Remove **Title: ...** pattern if found
    let cleanContent = content.replace(/^\*\*Title:\s*[^*\n]+\*\*\s*\n?/i, '');
    
    // If no formal title pattern, check if first line looks like a title
    if (cleanContent === content) {
      const lines = content.split('\n');
      const firstLine = lines[0];
      
      // If first line is short, wrapped in ** or looks like a title, remove it
      if (firstLine.length < 100 && (
        firstLine.match(/^\*\*.*\*\*$/) || 
        firstLine.match(/^[A-Z][^.!?]*$/) ||
        lines.length > 1 && lines[1].trim() === ''
      )) {
        cleanContent = lines.slice(1).join('\n').trim();
      }
    }
    
    return cleanContent;
  }
}

// Export singleton instances
export const dataService = new DataService();
export const aiService = new AIService();
export default { dataService, aiService };