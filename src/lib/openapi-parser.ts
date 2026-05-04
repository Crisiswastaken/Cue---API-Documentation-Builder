/**
 * API Spec Parser
 * Supports OpenAPI 3.x and Swagger 2.x in JSON and YAML formats.
 */

import { parse as parseYAML } from 'yaml';
import {
  AuthHeader,
  OpenAPISpec,
  Parameter,
  ParsedEndpoint,
  SpecFormat,
  SwaggerSpec,
} from './openapi-types';
import { resolveSchemaToJSON } from './schema-resolver';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
const PREFERRED_RESPONSE_CODES = ['200', '201', '202', '204'];
const SUPPORTED_SPEC_FILENAMES = ['openapi.json', 'openapi.yaml', 'swagger.json', 'swagger.yaml'];

interface ParsedSpecPayload {
  format: SpecFormat;
  endpoints: ParsedEndpoint[];
}

interface ParsedSpecDocument {
  data: unknown;
  isJSON: boolean;
}

/**
 * Validates that input is an OpenAPI 3.x document.
 */
export function validateOpenAPISpec(data: unknown): data is OpenAPISpec {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const spec = data as Partial<OpenAPISpec>;
  return (
    typeof spec.openapi === 'string' &&
    spec.openapi.startsWith('3.') &&
    !!spec.paths &&
    typeof spec.paths === 'object'
  );
}

/**
 * Validates that input is a Swagger 2.0 document.
 */
export function validateSwaggerSpec(data: unknown): data is SwaggerSpec {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const spec = data as Partial<SwaggerSpec>;
  return (
    typeof spec.swagger === 'string' &&
    spec.swagger.startsWith('2.') &&
    !!spec.paths &&
    typeof spec.paths === 'object'
  );
}

function toPrettyJSON(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function tryParseJSON(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function parseSpecDocument(input: string): ParsedSpecDocument {
  const jsonData = tryParseJSON(input);
  if (jsonData !== null) {
    return { data: jsonData, isJSON: true };
  }

  try {
    return { data: parseYAML(input), isJSON: false };
  } catch (error) {
    throw new Error(
      `Unable to parse specification. Expected valid JSON or YAML. ${error instanceof Error ? error.message : 'Unknown parse error.'}`
    );
  }
}

function replaceSwaggerRef(ref: string): string {
  if (ref.startsWith('#/definitions/')) {
    return ref.replace('#/definitions/', '#/components/schemas/');
  }
  return ref;
}

function normalizeSwaggerRefs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSwaggerRefs(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const entry = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(entry)) {
    if (key === '$ref' && typeof child === 'string') {
      normalized[key] = replaceSwaggerRef(child);
    } else {
      normalized[key] = normalizeSwaggerRefs(child);
    }
  }

  return normalized;
}

function openAPILikeSpecForSwagger(swaggerSpec: SwaggerSpec): OpenAPISpec {
  return {
    openapi: '3.0.0',
    info: swaggerSpec.info ?? {},
    paths: {},
    components: {
      schemas: swaggerSpec.definitions ?? {},
    },
  };
}

function parseOpenAPIAuthHeader(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): AuthHeader | null {
  if (!endpoint.security || endpoint.security.length === 0) {
    return null;
  }

  const securityRequirement = endpoint.security[0];
  const schemeName = Object.keys(securityRequirement)[0];

  if (!schemeName || !spec.components?.securitySchemes) {
    return null;
  }

  const scheme = spec.components.securitySchemes[schemeName];
  if (!scheme) {
    return null;
  }

  const authHeader: AuthHeader = {
    type: 'none',
    description: scheme.description,
  };

  if (scheme.type === 'http') {
    if (scheme.scheme === 'bearer') {
      authHeader.type = 'bearer';
    } else if (scheme.scheme === 'basic') {
      authHeader.type = 'basic';
    }
  } else if (scheme.type === 'apiKey') {
    authHeader.type = 'apiKey';
    authHeader.name = scheme.name;
    authHeader.in = scheme.in;
  }

  return authHeader;
}

function parseSwaggerAuthHeader(
  endpoint: NonNullable<SwaggerSpec['paths'][string][string]>,
  spec: SwaggerSpec
): AuthHeader | null {
  if (!endpoint.security || endpoint.security.length === 0) {
    return null;
  }

  const securityRequirement = endpoint.security[0];
  const schemeName = Object.keys(securityRequirement)[0];
  const scheme = schemeName ? spec.securityDefinitions?.[schemeName] : undefined;

  if (!scheme) {
    return null;
  }

  if (scheme.type === 'apiKey') {
    return {
      type: 'apiKey',
      name: scheme.name,
      in: scheme.in,
      description: scheme.description,
    };
  }

  if (scheme.type === 'basic') {
    return {
      type: 'basic',
      description: scheme.description,
    };
  }

  return {
    type: 'bearer',
    description: scheme.description,
  };
}

function parseOpenAPIParameters(endpoint: NonNullable<OpenAPISpec['paths'][string][string]>): Parameter[] {
  if (!endpoint.parameters || !Array.isArray(endpoint.parameters)) {
    return [];
  }

  return endpoint.parameters.map((param) => ({
    name: param.name,
    location: param.in,
    type: param.schema?.type || 'string',
    required: param.required || false,
    description: param.description,
  }));
}

function parseSwaggerParameters(endpoint: NonNullable<SwaggerSpec['paths'][string][string]>): Parameter[] {
  if (!endpoint.parameters || !Array.isArray(endpoint.parameters)) {
    return [];
  }

  return endpoint.parameters
    .filter((param) => param.name && param.in && ['path', 'query', 'header', 'cookie'].includes(param.in))
    .map((param) => ({
      name: param.name as string,
      location: param.in as Parameter['location'],
      type: param.type || 'string',
      required: !!param.required,
      description: param.description,
    }));
}

function parseOpenAPIRequestBody(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): string {
  if (!endpoint.requestBody?.content) {
    return '';
  }

  const jsonContent = endpoint.requestBody.content['application/json'];
  if (jsonContent) {
    if (jsonContent.example !== undefined) {
      return toPrettyJSON(jsonContent.example);
    }
    if (jsonContent.schema) {
      return resolveSchemaToJSON(jsonContent.schema, spec);
    }
  }

  const firstContentType = Object.keys(endpoint.requestBody.content)[0];
  if (!firstContentType) {
    return '';
  }

  const content = endpoint.requestBody.content[firstContentType];
  if (content.example !== undefined) {
    return toPrettyJSON(content.example);
  }

  if (content.schema) {
    return resolveSchemaToJSON(content.schema, spec);
  }

  return '';
}

function resolveSwaggerSchemaToJSON(schema: unknown, spec: SwaggerSpec): string {
  const normalizedSchema = normalizeSwaggerRefs(schema);
  return resolveSchemaToJSON(normalizedSchema, openAPILikeSpecForSwagger(spec));
}

function parseSwaggerRequestBody(
  endpoint: NonNullable<SwaggerSpec['paths'][string][string]>,
  spec: SwaggerSpec
): string {
  if (!endpoint.parameters || !Array.isArray(endpoint.parameters)) {
    return '';
  }

  const bodyParam = endpoint.parameters.find((param) => param.in === 'body' && param.schema);
  if (!bodyParam?.schema) {
    return '';
  }

  return resolveSwaggerSchemaToJSON(bodyParam.schema, spec);
}

function parseOpenAPIResponseBody(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): string {
  if (!endpoint.responses) {
    return '';
  }

  for (const code of PREFERRED_RESPONSE_CODES) {
    const response = endpoint.responses[code];
    if (!response?.content) {
      continue;
    }

    const jsonContent = response.content['application/json'];
    if (jsonContent) {
      if (jsonContent.example !== undefined) {
        return toPrettyJSON(jsonContent.example);
      }
      if (jsonContent.schema) {
        return resolveSchemaToJSON(jsonContent.schema, spec);
      }
    }
  }

  const firstResponseCode = Object.keys(endpoint.responses)[0];
  if (!firstResponseCode) {
    return '';
  }

  const response = endpoint.responses[firstResponseCode];
  const firstContentType = response.content ? Object.keys(response.content)[0] : undefined;
  if (!firstContentType || !response.content) {
    return '';
  }

  const content = response.content[firstContentType];
  if (content.example !== undefined) {
    return toPrettyJSON(content.example);
  }

  if (content.schema) {
    return resolveSchemaToJSON(content.schema, spec);
  }

  return '';
}

function parseSwaggerResponseBody(
  endpoint: NonNullable<SwaggerSpec['paths'][string][string]>,
  spec: SwaggerSpec
): string {
  if (!endpoint.responses) {
    return '';
  }

  for (const code of PREFERRED_RESPONSE_CODES) {
    const response = endpoint.responses[code];
    if (!response) {
      continue;
    }

    if (response.examples && response.examples['application/json'] !== undefined) {
      return toPrettyJSON(response.examples['application/json']);
    }

    if (response.schema) {
      return resolveSwaggerSchemaToJSON(response.schema, spec);
    }
  }

  const firstResponseCode = Object.keys(endpoint.responses)[0];
  if (!firstResponseCode) {
    return '';
  }

  const response = endpoint.responses[firstResponseCode];
  if (response.examples && response.examples['application/json'] !== undefined) {
    return toPrettyJSON(response.examples['application/json']);
  }

  if (response.schema) {
    return resolveSwaggerSchemaToJSON(response.schema, spec);
  }

  return '';
}

/**
 * Extracts all endpoints from an OpenAPI 3.x document.
 */
export function parseOpenAPISpec(spec: OpenAPISpec): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const endpoint = pathItem[method];
      if (!endpoint) {
        continue;
      }

      endpoints.push({
        id: `${method.toUpperCase()}:${path}`,
        method: method.toUpperCase(),
        path,
        summary: endpoint.summary || '',
        description: endpoint.description,
        parameters: parseOpenAPIParameters(endpoint),
        authHeader: parseOpenAPIAuthHeader(endpoint, spec),
        requestBody: parseOpenAPIRequestBody(endpoint, spec),
        responseBody: parseOpenAPIResponseBody(endpoint, spec),
        tags: endpoint.tags || [],
        operationId: endpoint.operationId,
      });
    }
  }

  return endpoints;
}

/**
 * Extracts all endpoints from a Swagger 2.x document.
 */
export function parseSwaggerSpec(spec: SwaggerSpec): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const endpoint = pathItem[method];
      if (!endpoint) {
        continue;
      }

      endpoints.push({
        id: `${method.toUpperCase()}:${path}`,
        method: method.toUpperCase(),
        path,
        summary: endpoint.summary || '',
        description: endpoint.description,
        parameters: parseSwaggerParameters(endpoint),
        authHeader: parseSwaggerAuthHeader(endpoint, spec),
        requestBody: parseSwaggerRequestBody(endpoint, spec),
        responseBody: parseSwaggerResponseBody(endpoint, spec),
        tags: endpoint.tags || [],
        operationId: endpoint.operationId,
      });
    }
  }

  return endpoints;
}

/**
 * Parse a JSON/YAML specification string and normalize endpoint output.
 */
export function parseSpecString(specString: string, sourceName = 'spec'): ParsedSpecPayload {
  if (!specString.trim()) {
    throw new Error('Specification input is empty');
  }

  const { data, isJSON } = parseSpecDocument(specString);
  const inferredSerialization = sourceName.toLowerCase().endsWith('.yaml') || sourceName.toLowerCase().endsWith('.yml')
    ? 'yaml'
    : sourceName.toLowerCase().endsWith('.json')
      ? 'json'
      : isJSON
        ? 'json'
        : 'yaml';

  if (validateOpenAPISpec(data)) {
    return {
      format: (inferredSerialization === 'json' ? 'openapi-json' : 'openapi-yaml') as SpecFormat,
      endpoints: parseOpenAPISpec(data),
    };
  }

  if (validateSwaggerSpec(data)) {
    return {
      format: (inferredSerialization === 'json' ? 'swagger-json' : 'swagger-yaml') as SpecFormat,
      endpoints: parseSwaggerSpec(data),
    };
  }

  throw new Error('Unsupported specification format. Provide OpenAPI 3.x or Swagger 2.x in JSON or YAML.');
}

/**
 * Utility to read and parse uploaded JSON/YAML specs.
 */
export async function readSpecFile(file: File): Promise<ParsedSpecPayload> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.readAsText(file);
  });

  return parseSpecString(text, file.name);
}

/**
 * Backward-compatible helper used by existing callers expecting OpenAPI objects.
 */
export async function readOpenAPIFile(file: File): Promise<OpenAPISpec> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.readAsText(file);
  });

  const { data } = parseSpecDocument(text);
  if (!validateOpenAPISpec(data)) {
    throw new Error('Invalid OpenAPI specification. Must be OpenAPI 3.x with paths.');
  }

  return data;
}

/**
 * Backward-compatible helper for JSON paste flow.
 */
export function parseJSONString(jsonString: string): OpenAPISpec {
  const { data } = parseSpecDocument(jsonString);
  if (!validateOpenAPISpec(data)) {
    throw new Error('Invalid OpenAPI specification. Must be OpenAPI 3.x with paths.');
  }

  return data;
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function joinOriginPath(origin: string, path: string, fileName: string): string {
  const normalizedPath = path === '/' ? '' : normalizePath(path);
  return `${origin}${normalizedPath}/${fileName}`;
}

/**
 * Derive likely OpenAPI/Swagger spec URLs from a documentation URL.
 */
export function deriveSpecUrlsFromDocsUrl(docsUrl: string): string[] {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(docsUrl);
  } catch {
    throw new Error('Please provide a valid URL (including http:// or https://).');
  }

  const origin = parsedUrl.origin;
  const normalizedPath = normalizePath(parsedUrl.pathname);
  const candidateBases = new Set<string>(['/', normalizedPath]);

  const docsSuffixes = ['/docs', '/swagger', '/api-docs'];
  for (const suffix of docsSuffixes) {
    if (normalizedPath.endsWith(suffix)) {
      const stripped = normalizedPath.slice(0, normalizedPath.length - suffix.length) || '/';
      candidateBases.add(normalizePath(stripped));
    }
  }

  if (normalizedPath !== '/') {
    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      const parentPath = `/${parts.slice(0, -1).join('/')}`;
      candidateBases.add(normalizePath(parentPath || '/'));
    }
  }

  const urls: string[] = [];
  for (const basePath of candidateBases) {
    for (const fileName of SUPPORTED_SPEC_FILENAMES) {
      urls.push(joinOriginPath(origin, basePath, fileName));
    }
  }

  return Array.from(new Set(urls));
}

/**
 * Try derived spec URLs until one returns a valid OpenAPI/Swagger JSON/YAML document.
 */
export async function fetchSpecFromDocumentationUrl(docsUrl: string): Promise<{
  format: SpecFormat;
  specUrl: string;
  endpoints: ParsedEndpoint[];
}> {
  const candidates = deriveSpecUrlsFromDocsUrl(docsUrl);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: 'application/json, application/yaml, text/yaml, text/plain, */*',
        },
      });

      if (!response.ok) {
        errors.push(`${candidate} (${response.status})`);
        continue;
      }

      const text = await response.text();
      if (!text.trim()) {
        errors.push(`${candidate} (empty response)`);
        continue;
      }

      const parsed = parseSpecString(text, candidate);
      return {
        format: parsed.format,
        specUrl: candidate,
        endpoints: parsed.endpoints,
      };
    } catch {
      errors.push(`${candidate} (request failed)`);
    }
  }

  throw new Error(
    `Unable to locate a valid OpenAPI/Swagger document. Tried: ${errors.slice(0, 4).join(', ')}${
      errors.length > 4 ? '...' : ''
    }`
  );
}
