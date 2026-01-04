/**
 * OpenAPI Schema Resolver
 * Resolves $ref pointers and generates example JSON from schemas
 */

import { OpenAPISpec } from './openapi-types';

/**
 * Resolves a $ref pointer to its actual schema
 * @param ref - Reference string like "#/components/schemas/AssetListOut"
 * @param spec - Full OpenAPI specification
 * @returns Resolved schema object or null if not found
 */
function resolveRef(ref: string, spec: OpenAPISpec): unknown {
  // Parse the $ref path (e.g., "#/components/schemas/AssetListOut")
  const parts = ref.replace('#/', '').split('/');
  
  let current: any = spec;
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Generates an example value for a given type
 */
function getExampleForType(type: string, format?: string): unknown {
  switch (type) {
    case 'string':
      if (format === 'uuid') return '3fa85f64-5717-4562-b3fc-2c963f66afa6';
      if (format === 'date-time') return new Date().toISOString();
      if (format === 'date') return new Date().toISOString().split('T')[0];
      if (format === 'email') return 'user@example.com';
      if (format === 'uri') return 'https://example.com';
      return 'string';
    case 'integer':
      return 0;
    case 'number':
      return 0.0;
    case 'boolean':
      return true;
    case 'null':
      return null;
    default:
      return 'unknown';
  }
}

/**
 * Recursively resolves a schema to an example JSON object
 * Handles $ref, allOf, anyOf, oneOf, arrays, objects
 * @param schema - Schema object to resolve
 * @param spec - Full OpenAPI specification
 * @param visited - Set of visited refs to prevent circular references
 * @param depth - Current recursion depth (max 10)
 */
export function resolveSchema(
  schema: any,
  spec: OpenAPISpec,
  visited = new Set<string>(),
  depth = 0
): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '...';
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // Handle $ref
  if (schema.$ref) {
    const ref = schema.$ref as string;
    
    // Prevent circular references
    if (visited.has(ref)) {
      return { $ref: ref };
    }
    
    visited.add(ref);
    const resolved = resolveRef(ref, spec);
    
    if (!resolved) {
      visited.delete(ref); // Clean up on failure
      return { $ref: ref };
    }
    
    const result = resolveSchema(resolved, spec, visited, depth + 1);
    visited.delete(ref); // Remove from visited after processing this branch
    return result;
  }

  // Handle allOf (merge all schemas)
  if (schema.allOf && Array.isArray(schema.allOf)) {
    const merged: any = {};
    for (const subSchema of schema.allOf) {
      const resolved = resolveSchema(subSchema, spec, visited, depth + 1);
      Object.assign(merged, resolved);
    }
    return merged;
  }

  // Handle anyOf/oneOf (take first non-null option and resolve it)
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    // Find first non-null option
    const firstNonNull = schema.anyOf.find((s: any) => s.type !== 'null');
    if (firstNonNull) {
      return resolveSchema(firstNonNull, spec, visited, depth + 1);
    }
    return resolveSchema(schema.anyOf[0], spec, visited, depth + 1);
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    // Find first non-null option
    const firstNonNull = schema.oneOf.find((s: any) => s.type !== 'null');
    if (firstNonNull) {
      return resolveSchema(firstNonNull, spec, visited, depth + 1);
    }
    return resolveSchema(schema.oneOf[0], spec, visited, depth + 1);
  }

  // Handle arrays
  if (schema.type === 'array' && schema.items) {
    const itemExample = resolveSchema(schema.items, spec, visited, depth + 1);
    return [itemExample];
  }

  // Handle objects
  if (schema.type === 'object' || schema.properties) {
    const result: any = {};
    
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        result[key] = resolveSchema(value, spec, visited, depth + 1);
      }
    }
    
    return result;
  }

  // Handle primitive types
  if (schema.type) {
    // Check for example or default first
    if (schema.example !== undefined) {
      return schema.example;
    }
    if (schema.default !== undefined) {
      return schema.default;
    }
    
    return getExampleForType(schema.type, schema.format);
  }

  // If no type specified, check for enum
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  return schema;
}

/**
 * Resolve and format a schema to pretty JSON string
 * @param schema - Schema object (may contain $ref)
 * @param spec - Full OpenAPI specification
 * @returns Formatted JSON string
 */
export function resolveSchemaToJSON(schema: any, spec: OpenAPISpec): string {
  if (!schema) {
    return '';
  }

  try {
    const resolved = resolveSchema(schema, spec);
    return JSON.stringify(resolved, null, 2);
  } catch (error) {
    console.error('Error resolving schema:', error);
    return JSON.stringify(schema, null, 2);
  }
}
