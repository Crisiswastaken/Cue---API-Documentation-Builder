/**
 * Markdown Generator
 * Compiles selected endpoints into a single markdown documentation file
 * Preserves user edits and maintains formatting
 */

import { EditableEndpoint } from './openapi-types';

/**
 * Generate markdown documentation for a single endpoint
 */
function generateEndpointMarkdown(endpoint: EditableEndpoint): string {
  let markdown = `## ${endpoint.method} ${endpoint.path}\n\n`;

  // Summary
  if (endpoint.summary) {
    markdown += `**Summary:** ${endpoint.summary}\n\n`;
  }

  // Description
  if (endpoint.description) {
    markdown += `**Description:**\n${endpoint.description}\n\n`;
  }

  // Parameters
  if (endpoint.parameters.length > 0) {
    markdown += `**Parameters:**\n`;
    endpoint.parameters.forEach((param) => {
      const required = param.required ? ' (required)' : ' (optional)';
      const location = ` [${param.location}]`;
      const description = param.description ? ` - ${param.description}` : '';
      markdown += `- \`${param.name}\` (${param.type})${location}${required}${description}\n`;
    });
    markdown += `\n`;
  }

  // Auth Header
  if (endpoint.authHeader && endpoint.authHeader.type !== 'none') {
    markdown += `**Authentication:**\n`;
    markdown += `- Type: ${endpoint.authHeader.type}\n`;
    if (endpoint.authHeader.name) {
      markdown += `- Header: ${endpoint.authHeader.name}\n`;
    }
    if (endpoint.authHeader.in) {
      markdown += `- Location: ${endpoint.authHeader.in}\n`;
    }
    if (endpoint.authHeader.description) {
      markdown += `- Description: ${endpoint.authHeader.description}\n`;
    }
    markdown += `\n`;
  }

  // Request Body
  if (endpoint.requestBody && endpoint.requestBody.trim()) {
    markdown += `**Request Body:**\n\n`;
    markdown += '```json\n';
    markdown += endpoint.requestBody;
    markdown += '\n```\n\n';
  }

  // Response Body
  if (endpoint.responseBody && endpoint.responseBody.trim()) {
    markdown += `**Response Body:**\n\n`;
    markdown += '```json\n';
    markdown += endpoint.responseBody;
    markdown += '\n```\n\n';
  }

  // Tags
  if (endpoint.tags.length > 0) {
    markdown += `**Tags:** ${endpoint.tags.join(', ')}\n\n`;
  }

  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generate complete markdown documentation from selected endpoints
 */
export function generateMarkdownDocumentation(
  endpoints: EditableEndpoint[],
  title = 'API Documentation'
): string {
  // Filter selected endpoints only
  const selectedEndpoints = endpoints.filter((e) => e.selected);

  if (selectedEndpoints.length === 0) {
    return '# No endpoints selected\n\nPlease select at least one endpoint to generate documentation.';
  }

  let markdown = `# ${title}\n\n`;
  markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
  markdown += `Total endpoints: ${selectedEndpoints.length}\n\n`;
  markdown += `---\n\n`;

  // Generate documentation for each endpoint
  selectedEndpoints.forEach((endpoint) => {
    markdown += generateEndpointMarkdown(endpoint);
  });

  return markdown;
}

/**
 * Trigger browser download of markdown file
 */
export function downloadMarkdown(content: string, filename = 'api-documentation.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
