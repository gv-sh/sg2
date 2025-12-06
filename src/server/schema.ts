/**
 * Database Schema Definition for SpecGen Server
 * Single source of truth for all database tables, indexes, and default data
 *
 * This file consolidates schema definitions from:
 * - services.js (production schema)
 * - test.js (test schema)
 * - API documentation (swagger fields)
 * - Code references (all fields actually used)
 */

import type { TablesDefinition, DefaultSetting, ExpectedFields } from '../types/database.js';

/**
 * Schema version for migration tracking
 */
export const SCHEMA_VERSION = '2.0.0';

/**
 * Table Definitions
 * Each table includes: columns, constraints, and indexes
 */
export const TABLES: TablesDefinition = {
  categories: {
    name: 'categories',
    columns: [
      'id TEXT PRIMARY KEY',
      'name TEXT NOT NULL UNIQUE',
      'description TEXT DEFAULT \'\'',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    indexes: [
      'CREATE INDEX idx_categories_name ON categories(name)'
    ]
  },

  parameters: {
    name: 'parameters',
    columns: [
      'id TEXT PRIMARY KEY',
      'name TEXT NOT NULL',
      'description TEXT DEFAULT \'\'',
      'type TEXT NOT NULL CHECK(type IN (\'select\', \'radio\', \'text\', \'range\', \'boolean\'))',
      'category_id TEXT NOT NULL',
      'parameter_values TEXT',
      'parameter_config TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE'
    ],
    indexes: [
      'CREATE INDEX idx_parameters_category_id ON parameters(category_id)',
      'CREATE INDEX idx_parameters_type ON parameters(type)'
    ]
  },

  generated_content: {
    name: 'generated_content',
    columns: [
      'id TEXT PRIMARY KEY',
      'title TEXT NOT NULL CHECK(length(title) <= 200)',
      'fiction_content TEXT NOT NULL CHECK(length(fiction_content) <= 50000)',
      'image_blob BLOB',
      'image_thumbnail BLOB',
      'image_format TEXT DEFAULT \'png\'',
      'image_size_bytes INTEGER DEFAULT 0',
      'thumbnail_size_bytes INTEGER DEFAULT 0',
      'prompt_data TEXT',
      'metadata TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    indexes: [
      'CREATE INDEX idx_content_created_at ON generated_content(created_at DESC)'
    ]
  },

  settings: {
    name: 'settings',
    columns: [
      'key TEXT PRIMARY KEY',
      'value TEXT NOT NULL',
      'data_type TEXT DEFAULT \'string\' CHECK(data_type IN (\'string\', \'number\', \'boolean\', \'json\'))'
    ],
    indexes: []
  }
};

/**
 * Default Settings Data
 * Inserted when database is first created
 */
export const DEFAULT_SETTINGS: DefaultSetting[] = [
  { key: 'app_version', value: '2.0.0', data_type: 'string' },
  { key: 'max_content_length', value: '10000', data_type: 'number' },
  { key: 'max_generations_per_session', value: '50', data_type: 'number' },
  { key: 'enable_image_generation', value: 'true', data_type: 'boolean' },
  { key: 'default_fiction_length', value: 'medium', data_type: 'string' },
  { key: 'rate_limit_per_minute', value: '10', data_type: 'number' },
  { key: 'maintenance_mode', value: 'false', data_type: 'boolean' }
];

/**
 * Generate CREATE TABLE statement for a table
 * @param tableName - Name of the table
 * @param ifNotExists - Add IF NOT EXISTS clause (default: false)
 */
export function createTableSQL(tableName: keyof TablesDefinition, ifNotExists = false): string {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  const ifNotExistsClause = ifNotExists ? 'IF NOT EXISTS ' : '';
  return `CREATE TABLE ${ifNotExistsClause}${table.name} (\n  ${table.columns.join(',\n  ')}\n)`;
}

/**
 * Generate all CREATE INDEX statements for a table
 * @param tableName - Name of the table
 * @param ifNotExists - Add IF NOT EXISTS clause (default: false)
 */
export function createIndexesSQL(tableName: keyof TablesDefinition, ifNotExists = false): string[] {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  if (ifNotExists) {
    return table.indexes.map(idx => idx.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS'));
  }
  return table.indexes;
}

/**
 * Get all table names in creation order (respects foreign keys)
 */
export function getTableNames(): (keyof TablesDefinition)[] {
  return ['categories', 'parameters', 'generated_content', 'settings'];
}

/**
 * Generate SQL to insert default settings
 */
export function insertDefaultSettingsSQL(): string {
  const values = DEFAULT_SETTINGS.map(s =>
    `('${s.key}', '${s.value}', '${s.data_type}')`
  ).join(',\n      ');

  return `INSERT INTO settings (key, value, data_type) VALUES\n      ${values}`;
}

/**
 * Get field list for a table (useful for INSERT/SELECT operations)
 */
export function getTableFields(tableName: keyof TablesDefinition): string[] {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  return table.columns
    .map(col => col.split(' ')[0])
    .filter(field => !field.startsWith('FOREIGN') && !field.startsWith('CHECK'));
}

/**
 * Complete schema initialization script
 * Returns array of SQL statements to execute in order
 * @param ifNotExists - Add IF NOT EXISTS clauses (useful for tests)
 */
export function getSchemaInitSQL(ifNotExists = false): string[] {
  const statements: string[] = [];

  // Enable foreign keys
  statements.push('PRAGMA foreign_keys = ON');

  // Create tables in order
  getTableNames().forEach(tableName => {
    statements.push(createTableSQL(tableName, ifNotExists));
  });

  // Create indexes
  getTableNames().forEach(tableName => {
    const indexes = createIndexesSQL(tableName, ifNotExists);
    statements.push(...indexes);
  });

  // Insert default settings (only if not using ifNotExists, to avoid duplicates)
  if (!ifNotExists) {
    statements.push(insertDefaultSettingsSQL());
  }

  return statements;
}

/**
 * Schema validation helper
 * Returns the expected fields for each table
 */
export const EXPECTED_FIELDS: ExpectedFields = {
  categories: ['id', 'name', 'description', 'created_at'],
  parameters: ['id', 'name', 'description', 'type', 'category_id', 'parameter_values', 'parameter_config', 'created_at'],
  generated_content: ['id', 'title', 'fiction_content', 'image_blob', 'image_thumbnail', 'image_format', 'image_size_bytes', 'thumbnail_size_bytes', 'prompt_data', 'metadata', 'created_at'],
  settings: ['key', 'value', 'data_type']
};

export default {
  SCHEMA_VERSION,
  TABLES,
  DEFAULT_SETTINGS,
  EXPECTED_FIELDS,
  createTableSQL,
  createIndexesSQL,
  getTableNames,
  insertDefaultSettingsSQL,
  getTableFields,
  getSchemaInitSQL
};