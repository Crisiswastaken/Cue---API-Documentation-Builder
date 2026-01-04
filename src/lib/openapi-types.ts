/**
 * TypeScript types for parsed OpenAPI endpoint data
 * These types represent the normalized, frontend-safe structure
 * extracted from an OpenAPI 3.x JSON file
 */

export interface Parameter {
  name: string;
  location: 'path' | 'query' | 'header' | 'cookie';
  type: string;
  required: boolean;
  description?: string;
}

export interface AuthHeader {
  type: 'bearer' | 'apiKey' | 'basic' | 'none';
  name?: string;
  in?: string;
  description?: string;
}

export interface ParsedEndpoint {
  id: string; // Unique identifier: `{method}:{path}`
  method: string; // GET, POST, PUT, DELETE, etc.
  path: string; // /api/users/{id}
  summary: string;
  description?: string;
  parameters: Parameter[];
  authHeader: AuthHeader | null;
  requestBody: string; // JSON string or empty
  responseBody: string; // JSON string or empty
  tags: string[];
  operationId?: string;
}

export interface EditableEndpoint extends ParsedEndpoint {
  selected: boolean; // Whether this endpoint is selected for export
}

/**
 * Raw OpenAPI 3.x structures (subset we care about)
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        operationId?: string;
        tags?: string[];
        parameters?: Array<{
          name: string;
          in: 'path' | 'query' | 'header' | 'cookie';
          required?: boolean;
          description?: string;
          schema?: {
            type?: string;
            [key: string]: unknown;
          };
        }>;
        requestBody?: {
          content?: {
            [contentType: string]: {
              schema?: unknown;
              example?: unknown;
            };
          };
          required?: boolean;
        };
        responses?: {
          [statusCode: string]: {
            description?: string;
            content?: {
              [contentType: string]: {
                schema?: unknown;
                example?: unknown;
              };
            };
          };
        };
        security?: Array<{
          [key: string]: string[];
        }>;
      };
    };
  };
  components?: {
    schemas?: {
      [key: string]: unknown;
    };
    securitySchemes?: {
      [key: string]: {
        type: string;
        scheme?: string;
        bearerFormat?: string;
        name?: string;
        in?: string;
        description?: string;
      };
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
}
