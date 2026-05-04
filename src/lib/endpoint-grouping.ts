import { EditableEndpoint } from './openapi-types';

export interface EndpointGroup {
  key: string;
  label: string;
  endpoints: EditableEndpoint[];
  selectedCount: number;
}

function toTitleCase(value: string): string {
  if (!value) {
    return 'Ungrouped';
  }

  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function looksLikeVersion(segment: string): boolean {
  return /^v\d+(?:\.\d+)*$/i.test(segment);
}

export function getEndpointGroupKey(endpoint: EditableEndpoint): string {
  const pathSegments = endpoint.path.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return 'ungrouped';
  }

  const versionIndex = pathSegments.findIndex((segment) => looksLikeVersion(segment));
  if (versionIndex >= 0 && pathSegments[versionIndex + 1]) {
    return pathSegments[versionIndex + 1].toLowerCase();
  }

  if (pathSegments[0]?.endsWith('-service') && pathSegments[1]) {
    return pathSegments[1].toLowerCase();
  }

  if (endpoint.tags.length > 0) {
    return endpoint.tags[0].toLowerCase();
  }

  return pathSegments[0].toLowerCase();
}

export function getEndpointSearchText(endpoint: EditableEndpoint): string {
  return [endpoint.method, endpoint.path, endpoint.summary, endpoint.description, endpoint.tags.join(' ')]
    .join(' ')
    .toLowerCase();
}

export function createEndpointGroups(
  endpoints: EditableEndpoint[],
  searchQuery: string
): EndpointGroup[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filtered =
    normalizedSearch.length === 0
      ? endpoints
      : endpoints.filter((endpoint) => getEndpointSearchText(endpoint).includes(normalizedSearch));

  const grouped = new Map<string, EditableEndpoint[]>();

  for (const endpoint of filtered) {
    const key = getEndpointGroupKey(endpoint);
    const existing = grouped.get(key) ?? [];
    existing.push(endpoint);
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([key, groupedEndpoints]) => ({
      key,
      label: toTitleCase(key),
      endpoints: groupedEndpoints.sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) {
          return pathCompare;
        }
        return a.method.localeCompare(b.method);
      }),
      selectedCount: groupedEndpoints.filter((endpoint) => endpoint.selected).length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
