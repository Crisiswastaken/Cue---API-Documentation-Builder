'use client';

/**
 * Documentation Builder Page
 * Main page for converting OpenAPI JSON to editable documentation
 * Supports file upload, editing, selection, and markdown export
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileJson, Download, Upload } from 'lucide-react';
import { readOpenAPIFile, parseOpenAPISpec } from '@/lib/openapi-parser';
import { EditableEndpoint } from '@/lib/openapi-types';
import { generateMarkdownDocumentation, downloadMarkdown } from '@/lib/markdown-generator';
import { EndpointCard } from '@/components/endpoint-card';
import { EndpointSelector } from '@/components/endpoint-selector';

export default function DocumentationBuilderPage() {
  const [endpoints, setEndpoints] = useState<EditableEndpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Please upload a valid .json file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      // Read and validate OpenAPI spec
      const spec = await readOpenAPIFile(file);

      // Parse endpoints
      const parsedEndpoints = parseOpenAPISpec(spec);

      // Convert to editable endpoints (all selected by default)
      const editableEndpoints: EditableEndpoint[] = parsedEndpoints.map((endpoint) => ({
        ...endpoint,
        selected: true,
      }));

      setEndpoints(editableEndpoints);

      if (editableEndpoints.length === 0) {
        setError('No endpoints found in the OpenAPI specification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEndpointUpdate = useCallback((updatedEndpoint: EditableEndpoint) => {
    setEndpoints((prev) =>
      prev.map((ep) => (ep.id === updatedEndpoint.id ? updatedEndpoint : ep))
    );
  }, []);

  const handleToggleEndpoint = useCallback((endpointId: string) => {
    setEndpoints((prev) =>
      prev.map((ep) => (ep.id === endpointId ? { ...ep, selected: !ep.selected } : ep))
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setEndpoints((prev) => prev.map((ep) => ({ ...ep, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setEndpoints((prev) => prev.map((ep) => ({ ...ep, selected: false })));
  }, []);

  const handleGenerateDocumentation = useCallback(() => {
    const selectedCount = endpoints.filter((e) => e.selected).length;

    if (selectedCount === 0) {
      setError('Please select at least one endpoint to generate documentation');
      return;
    }

    const markdown = generateMarkdownDocumentation(endpoints, 'API Documentation');
    downloadMarkdown(markdown, 'api-documentation.md');

    // Clear error if it was about no selection
    if (error?.includes('select at least one')) {
      setError(null);
    }
  }, [endpoints, error]);

  const handleReset = useCallback(() => {
    setEndpoints([]);
    setError(null);
    setFileName('');
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold mb-2">Documentation Builder</h1>
        <p className="text-muted-foreground">
          Convert OpenAPI 3.x JSON to editable API documentation and export as Markdown
        </p>
      </div>

      {/* File Upload Section */}
<Card className="mb-8">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileJson className="h-5 w-5" />
      Upload OpenAPI Specification
    </CardTitle>
    <CardDescription>
      Upload a standard OpenAPI 3.x JSON file to begin
    </CardDescription>
  </CardHeader>

  <CardContent>
    {/* Upload area */}
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-gray-400 focus:outline-none border-gray-300"
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-600">
              {fileName || 'Click to upload OpenAPI JSON file'}
            </span>
          </div>
          <input
            id="file-upload"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>

    {/* Reset button BELOW */}
    {endpoints.length > 0 && (
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    )}

    {isLoading && (
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Processing file...
      </div>
    )}
  </CardContent>
</Card>


      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Endpoints Display */}
      {endpoints.length > 0 && (
        <>
          {/* Generate Button */}
          <div className="mb-6 flex items-center justify-between top-0  bg-background/95 backdrop-blur py-4">
            <div className=''>
              <h2 className="text-2xl font-bold">Endpoints ({endpoints.length})</h2>
              <p className="text-sm text-muted-foreground">
                Edit any field below and select endpoints to include in documentation
              </p>
            </div>
            <Button onClick={handleGenerateDocumentation} size="lg" className="gap-2">
              <Download className="h-4 w-4" />
              Generate Documentation
            </Button>
          </div>

          {/* Endpoint Cards */}
          <div className="mb-8">
            {endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                onUpdate={handleEndpointUpdate}
              />
            ))}
          </div>

          {/* Endpoint Selector Panel */}
          <EndpointSelector
            endpoints={endpoints}
            onToggleEndpoint={handleToggleEndpoint}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        </>
      )}

      {/* Empty State */}
      {endpoints.length === 0 && !error && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileJson className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No API specification loaded</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Upload an OpenAPI 3.x JSON file to get started. The file will be parsed and
              displayed as editable documentation cards.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
