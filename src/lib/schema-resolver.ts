/**
 * OpenAPI Schema Resolver
 * Resolves $ref pointers and generates example JSON from schemas.
 */

import { OpenAPISpec } from './openapi-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Resolves a $ref pointer to its actual schema.
 */
function resolveRef(ref: string, spec: OpenAPISpec): unknown {
  const parts = ref.replace('#/', '').split('/');

  let current: unknown = spec;
  for (const part of parts) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[part];
  }

  return current;
}

/**
 * Generates an example value for a given primitive type.
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
 * Recursively resolves a schema to an example JSON value.
 */
export function resolveSchema(
  schema: unknown,
  spec: OpenAPISpec,
  visited = new Set<string>(),
  depth = 0
): unknown {
  if (depth > 10) {
    return '...';
  }

  if (!isRecord(schema)) {
    return schema;
  }

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref;

    if (visited.has(ref)) {
      return { $ref: ref };
    }

    visited.add(ref);
    const resolved = resolveRef(ref, spec);

    if (!resolved) {
      visited.delete(ref);
      return { $ref: ref };
    }

    const result = resolveSchema(resolved, spec, visited, depth + 1);
    visited.delete(ref);
    return result;
  }

  if (Array.isArray(schema.allOf)) {
    const merged: Record<string, unknown> = {};
    for (const subSchema of schema.allOf) {
      const resolved = resolveSchema(subSchema, spec, visited, depth + 1);
      if (isRecord(resolved)) {
        Object.assign(merged, resolved);
      }
    }
    return merged;
  }

  if (Array.isArray(schema.anyOf)) {
    const firstNonNull = schema.anyOf.find((candidate) => {
      return !(isRecord(candidate) && candidate.type === 'null');
    });

    if (firstNonNull !== undefined) {
      return resolveSchema(firstNonNull, spec, visited, depth + 1);
    }

    return resolveSchema(schema.anyOf[0], spec, visited, depth + 1);
  }

  if (Array.isArray(schema.oneOf)) {
    const firstNonNull = schema.oneOf.find((candidate) => {
      return !(isRecord(candidate) && candidate.type === 'null');
    });

    if (firstNonNull !== undefined) {
      return resolveSchema(firstNonNull, spec, visited, depth + 1);
    }

    return resolveSchema(schema.oneOf[0], spec, visited, depth + 1);
  }

  if (schema.type === 'array' && schema.items !== undefined) {
    return [resolveSchema(schema.items, spec, visited, depth + 1)];
  }

  if (schema.type === 'object' || isRecord(schema.properties)) {
    const result: Record<string, unknown> = {};

    if (isRecord(schema.properties)) {
      for (const [key, value] of Object.entries(schema.properties)) {
        result[key] = resolveSchema(value, spec, visited, depth + 1);
      }
    }

    return result;
  }

  if (typeof schema.type === 'string') {
    if (schema.example !== undefined) {
      return schema.example;
    }

    if (schema.default !== undefined) {
      return schema.default;
    }

    const format = typeof schema.format === 'string' ? schema.format : undefined;
    return getExampleForType(schema.type, format);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  return schema;
}

/**
 * Resolve and format a schema to pretty JSON string.
 */
export function resolveSchemaToJSON(schema: unknown, spec: OpenAPISpec): string {
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
