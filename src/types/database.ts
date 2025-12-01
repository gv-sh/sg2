/**
 * Database Type Definitions
 * Types for database tables, schemas, and data structures
 */

export interface TableDefinition {
  name: string;
  columns: string[];
  indexes: string[];
}

export interface TablesDefinition {
  categories: TableDefinition;
  parameters: TableDefinition;
  generated_content: TableDefinition;
  settings: TableDefinition;
}

export interface DefaultSetting {
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
}

export interface ExpectedFields {
  categories: string[];
  parameters: string[];
  generated_content: string[];
  settings: string[];
}