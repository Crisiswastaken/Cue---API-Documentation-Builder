/**
 * OpenAPI Parser
 * Parses a standard OpenAPI 3.x JSON file into editable endpoint data
 * NO UI SCRAPING - Direct JSON parsing only
 * NO AI interpretation - Only extract what exists
 */

import { OpenAPISpec, ParsedEndpoint, Parameter, AuthHeader } from './openapi-types';
import { resolveSchemaToJSON } from './schema-resolver';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

/**
 * Validates that the uploaded file is a valid OpenAPI spec
 */
export function validateOpenAPISpec(data: unknown): data is OpenAPISpec {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const spec = data as Partial<OpenAPISpec>;

  // Must have openapi version and paths
  if (!spec.openapi || typeof spec.openapi !== 'string') {
    return false;
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    return false;
  }

  // Basic OpenAPI 3.x version check
  if (!spec.openapi.startsWith('3.')) {
    return false;
  }

  return true;
}

/**
 * Parse security schemes to determine auth type
 */
function parseAuthHeader(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): AuthHeader | null {
  // Check if endpoint has security requirement
  if (!endpoint.security || endpoint.security.length === 0) {
    return null;
  }

  // Get first security requirement
  const securityRequirement = endpoint.security[0];
  const schemeName = Object.keys(securityRequirement)[0];

  if (!schemeName || !spec.components?.securitySchemes) {
    return null;
  }

  const scheme = spec.components.securitySchemes[schemeName];
  if (!scheme) {
    return null;
  }

  // Map security scheme type
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

/**
 * Parse parameters from endpoint
 */
function parseParameters(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>
): Parameter[] {
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

/**
 * Parse request body to JSON string
 * Resolves $ref pointers to actual schemas
 */
function parseRequestBody(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): string {
  if (!endpoint.requestBody?.content) {
    return '';
  }

  // Prefer application/json
  const jsonContent = endpoint.requestBody.content['application/json'];
  if (jsonContent) {
    if (jsonContent.example) {
      return JSON.stringify(jsonContent.example, null, 2);
    }
    if (jsonContent.schema) {
      // Resolve schema (including $ref)
      return resolveSchemaToJSON(jsonContent.schema, spec);
    }
  }

  // Fallback to first available content type
  const firstContentType = Object.keys(endpoint.requestBody.content)[0];
  if (firstContentType) {
    const content = endpoint.requestBody.content[firstContentType];
    if (content.example) {
      return JSON.stringify(content.example, null, 2);
    }
    if (content.schema) {
      // Resolve schema (including $ref)
      return resolveSchemaToJSON(content.schema, spec);
    }
  }

  return '';
}

/**
 * Parse response body to JSON string
 * Prefers 200 response, then 201, then first available
 * Resolves $ref pointers to actual schemas
 */
function parseResponseBody(
  endpoint: NonNullable<OpenAPISpec['paths'][string][string]>,
  spec: OpenAPISpec
): string {
  if (!endpoint.responses) {
    return '';
  }

  // Try 200, then 201, then 2xx codes
  const preferredCodes = ['200', '201', '202', '204'];
  for (const code of preferredCodes) {
    const response = endpoint.responses[code];
    if (response?.content) {
      const jsonContent = response.content['application/json'];
      if (jsonContent) {
        if (jsonContent.example) {
          return JSON.stringify(jsonContent.example, null, 2);
        }
        if (jsonContent.schema) {
          // Resolve schema (including $ref)
          return resolveSchemaToJSON(jsonContent.schema, spec);
        }
      }
    }
  }

  // Fallback to first available response
  const firstResponseCode = Object.keys(endpoint.responses)[0];
  if (firstResponseCode) {
    const response = endpoint.responses[firstResponseCode];
    if (response.content) {
      const firstContentType = Object.keys(response.content)[0];
      if (firstContentType) {
        const content = response.content[firstContentType];
        if (content.example) {
          return JSON.stringify(content.example, null, 2);
        }
        if (content.schema) {
          // Resolve schema (including $ref)
          return resolveSchemaToJSON(content.schema, spec);
        }
      }
    }
  }

  return '';
}

/**
 * Main parser function
 * Extracts all endpoints from OpenAPI spec
 */
export function parseOpenAPISpec(spec: OpenAPISpec): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  // Iterate over all paths
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    // Iterate over all HTTP methods for this path
    for (const method of HTTP_METHODS) {
      const endpoint = pathItem[method];
      if (!endpoint) {
        continue;
      }

      const parsedEndpoint: ParsedEndpoint = {
        id: `${method.toUpperCase()}:${path}`,
        method: method.toUpperCase(),
        path,
        summary: endpoint.summary || '',
        description: endpoint.description,
        parameters: parseParameters(endpoint),
        authHeader: parseAuthHeader(endpoint, spec),
        requestBody: parseRequestBody(endpoint, spec),
        responseBody: parseResponseBody(endpoint, spec),
        tags: endpoint.tags || [],
        operationId: endpoint.operationId,
      };

      endpoints.push(parsedEndpoint);
    }
  }

  return endpoints;
}

/**
 * Utility to read and parse uploaded file
 */
export async function readOpenAPIFile(file: File): Promise<OpenAPISpec> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!validateOpenAPISpec(data)) {
          reject(new Error('Invalid OpenAPI specification. Must be OpenAPI 3.x with paths.'));
          return;
        }

        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse JSON string directly (for copy-paste functionality)
 */
export function parseJSONString(jsonString: string): OpenAPISpec {
  if (!jsonString.trim()) {
    throw new Error('JSON input is empty');
  }

  try {
    const data = JSON.parse(jsonString);

    if (!validateOpenAPISpec(data)) {
      throw new Error('Invalid OpenAPI specification. Must be OpenAPI 3.x with paths.');
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format: ' + error.message);
    }
    throw error;
  }
}
