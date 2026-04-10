import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import type { FieldMapping, ApiSchemaField, TestConnectionResult } from './types';
import { TARGET_FIELDS } from './types';

/**
 * Test connection to an external API endpoint.
 * Returns sample data and detected schema.
 */
export async function testConnection(
  url: string,
  headers?: Record<string, string>
): Promise<TestConnectionResult> {
  try {
    const fetchHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: false,
        sampleData: null,
        schema: [],
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const rawData = await response.json();
    const records = extractRecords(rawData);

    if (!records || records.length === 0) {
      return {
        success: false,
        sampleData: rawData,
        schema: [],
        error: 'No array of records found in API response. Expected an array or an object containing an array.',
      };
    }

    const schema = analyzeSchema(records);

    return {
      success: true,
      sampleData: records.slice(0, 5),
      schema,
      recordCount: records.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      sampleData: null,
      schema: [],
      error: message,
    };
  }
}

/**
 * Extract an array of records from various API response shapes:
 * - Direct array: [...]
 * - Wrapped: { data: [...] }, { results: [...] }, { items: [...] }, { products: [...] }
 * - Nested: any top-level key whose value is an array of objects
 */
function extractRecords(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return data as Record<string, unknown>[];
    }
    return null;
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    // Check common wrapper keys first
    const commonKeys = ['data', 'results', 'items', 'products', 'records', 'entries', 'rows'];
    for (const key of commonKeys) {
      if (Array.isArray(obj[key]) && obj[key].length > 0) {
        return obj[key] as Record<string, unknown>[];
      }
    }
    // Fall back to first array property found
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        const first = (obj[key] as unknown[])[0];
        if (typeof first === 'object' && first !== null) {
          return obj[key] as Record<string, unknown>[];
        }
      }
    }
  }

  return null;
}

/**
 * Analyze the schema of the first few records to detect field names and types.
 */
export function analyzeSchema(records: Record<string, unknown>[]): ApiSchemaField[] {
  const sample = records.slice(0, 5);
  const fieldMap = new Map<string, { types: Set<string>; sample: unknown }>();

  for (const record of sample) {
    flattenObject(record, '', fieldMap);
  }

  return Array.from(fieldMap.entries()).map(([name, info]) => ({
    name,
    type: info.types.size === 1 ? Array.from(info.types)[0] : 'mixed',
    sampleValue: info.sample,
  }));
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix: string,
  fieldMap: Map<string, { types: Set<string>; sample: unknown }>
) {
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, fieldName, fieldMap);
    } else {
      const detectedType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      const existing = fieldMap.get(fieldName);
      if (existing) {
        existing.types.add(detectedType);
      } else {
        fieldMap.set(fieldName, { types: new Set([detectedType]), sample: value });
      }
    }
  }
}

/**
 * Use OpenAI to suggest field mappings from source schema to our Item model.
 */
export async function suggestMappings(
  schema: ApiSchemaField[],
  openaiApiKey: string
): Promise<FieldMapping[]> {
  const client = new OpenAI({ apiKey: openaiApiKey });

  const targetFieldDescriptions = TARGET_FIELDS.map(
    (f) => `${f.name} (${f.type}${f.required ? ', required' : ''})`
  ).join(', ');

  const sourceFieldDescriptions = schema
    .map((f) => `${f.name} (${f.type}, sample: ${JSON.stringify(f.sampleValue)})`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are mapping fields from an external API response to an inventory item model.

Target fields: ${targetFieldDescriptions}

Return a JSON object with a "mappings" key containing an array of objects, each with:
- sourceField: the source field name
- targetField: one of the target field names
- dataType: the target data type (string, number, boolean, or date)
- sourceDataType: the detected source type
- conversion: one of "none", "toString", "toNumber", "toBoolean", "parseDate"
- confidence: a number 0-1 indicating your confidence in this mapping

Only include mappings where you have a reasonable match (confidence > 0.3). Consider field names, sample values, and data types when making matches.`,
      },
      {
        role: 'user',
        content: `Source fields detected:\n${sourceFieldDescriptions}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const mappings: FieldMapping[] = parsed.mappings || [];
    // Validate each mapping
    return mappings.filter(
      (m) =>
        m.sourceField &&
        m.targetField &&
        TARGET_FIELDS.some((tf) => tf.name === m.targetField)
    );
  } catch {
    return [];
  }
}

/**
 * Apply field mappings and data type conversions to transform raw API data into Item-shaped records.
 */
export function applyConversions(
  records: Record<string, unknown>[],
  mappings: FieldMapping[]
): Record<string, unknown>[] {
  return records.map((record) => {
    const transformed: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const rawValue = getNestedValue(record, mapping.sourceField);
      if (rawValue === undefined) continue;

      transformed[mapping.targetField] = convertValue(rawValue, mapping);
    }

    return transformed;
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function convertValue(value: unknown, mapping: FieldMapping): unknown {
  if (value === null || value === undefined) return null;

  switch (mapping.conversion) {
    case 'none':
      return value;
    case 'toString':
      return String(value);
    case 'toNumber': {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    case 'toBoolean':
      if (typeof value === 'string') {
        return ['true', '1', 'yes'].includes(value.toLowerCase());
      }
      return Boolean(value);
    case 'parseDate':
      try {
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    default:
      return value;
  }
}

/**
 * Sync items from an external data source using saved mappings.
 */
export async function syncFromSource(
  tenantId: string,
  sourceId: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const source = await prisma.externalDataSource.findFirst({
    where: { id: sourceId, tenantId },
  });

  if (!source) {
    throw new Error('Data source not found');
  }

  const headers = source.apiHeaders ? JSON.parse(source.apiHeaders) : undefined;
  const connectionResult = await testConnection(source.apiUrl, headers);

  if (!connectionResult.success || !connectionResult.sampleData) {
    await prisma.externalDataSource.update({
      where: { id: sourceId },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'FAILED' },
    });
    throw new Error(connectionResult.error || 'Failed to fetch data from source');
  }

  const mappings: FieldMapping[] = JSON.parse(source.fieldMapping);
  const allRecords = connectionResult.sampleData as Record<string, unknown>[];
  const transformedRecords = applyConversions(allRecords, mappings);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const record of transformedRecords) {
    try {
      const name = record.name as string;
      if (!name) {
        errors.push('Skipped record: missing required field "name"');
        continue;
      }

      const itemData: Record<string, unknown> = {
        name,
        tenantId,
      };
      if (record.sku !== undefined) itemData.sku = String(record.sku);
      if (record.description !== undefined) itemData.description = String(record.description);
      if (record.unitCost !== undefined) itemData.unitCost = Number(record.unitCost) || 0;
      if (record.imageUrl !== undefined) itemData.imageUrl = String(record.imageUrl);

      // Check if item exists by SKU or externalId
      const externalId = record.externalId ? String(record.externalId) : null;
      const sku = record.sku ? String(record.sku) : null;

      let existingItem = null;
      if (sku) {
        existingItem = await prisma.item.findFirst({
          where: { tenantId, sku },
        });
      }

      if (existingItem) {
        await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            name: itemData.name as string,
            description: (itemData.description as string) || existingItem.description,
            unitCost: (itemData.unitCost as number) || existingItem.unitCost,
            imageUrl: (itemData.imageUrl as string) || existingItem.imageUrl,
          },
        });
        updated++;
      } else {
        // Handle category if mapped
        let categoryId: string | undefined;
        if (record.category) {
          const categoryName = String(record.category);
          const existingCategory = await prisma.itemCategory.findFirst({
            where: { tenantId, name: categoryName },
          });
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            const newCategory = await prisma.itemCategory.create({
              data: { tenantId, name: categoryName },
            });
            categoryId = newCategory.id;
          }
        }

        await prisma.item.create({
          data: {
            tenantId,
            name: itemData.name as string,
            sku: sku || undefined,
            description: (itemData.description as string) || undefined,
            unitCost: (itemData.unitCost as number) || undefined,
            imageUrl: (itemData.imageUrl as string) || undefined,
            categoryId: categoryId || undefined,
          },
        });
        created++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Error processing record: ${msg}`);
    }
  }

  await prisma.externalDataSource.update({
    where: { id: sourceId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: errors.length > 0 && created === 0 && updated === 0 ? 'FAILED' : 'SUCCESS',
    },
  });

  return { created, updated, errors };
}
