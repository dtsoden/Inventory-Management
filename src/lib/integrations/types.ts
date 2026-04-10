export interface FieldMapping {
  sourceField: string;      // Field from API response
  targetField: string;      // Our Item model field
  dataType: 'string' | 'number' | 'boolean' | 'date';
  sourceDataType: string;   // Detected type from API
  conversion: 'none' | 'toString' | 'toNumber' | 'toBoolean' | 'parseDate' | 'custom';
  customExpression?: string;
  confidence: number;       // AI confidence 0-1
}

export interface ExternalDataSourceConfig {
  id?: string;
  name: string;
  apiUrl: string;
  apiHeaders?: Record<string, string>;
  fieldMappings: FieldMapping[];
  isActive: boolean;
}

export interface ApiSchemaField {
  name: string;
  type: string;
  sampleValue: unknown;
}

export interface TestConnectionResult {
  success: boolean;
  sampleData: unknown;
  schema: ApiSchemaField[];
  error?: string;
  recordCount?: number;
}

export const TARGET_FIELDS = [
  { name: 'name', type: 'string', required: true },
  { name: 'sku', type: 'string', required: false },
  { name: 'description', type: 'string', required: false },
  { name: 'unitCost', type: 'number', required: true },
  { name: 'imageUrl', type: 'string', required: false },
  { name: 'externalId', type: 'string', required: false },
  { name: 'category', type: 'string', required: false },
] as const;

export type TargetFieldName = (typeof TARGET_FIELDS)[number]['name'];
