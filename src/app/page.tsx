'use client';

/**
 * Documentation Builder Page
 * Main page for converting OpenAPI JSON to editable documentation
 * Supports file upload, direct JSON paste, editing, selection, and markdown export
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileJson, Download, Upload, ClipboardPaste } from 'lucide-react';
import { readOpenAPIFile, parseOpenAPISpec, parseJSONString } from '@/lib/openapi-parser';
import { EditableEndpoint } from '@/lib/openapi-types';
import { generateMarkdownDocumentation, downloadMarkdown } from '@/lib/markdown-generator';
import { EndpointCard } from '@/components/endpoint-card';
import { EndpointSelector } from '@/components/endpoint-selector';
import { ModeToggle } from '@/components/mode-toggle';

type InputMode = 'upload' | 'paste';

export default function DocumentationBuilderPage() {
  const [endpoints, setEndpoints] = useState<EditableEndpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [jsonInput, setJsonInput] = useState<string>('');

  const processOpenAPISpec = useCallback((spec: ReturnType<typeof parseJSONString>) => {
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
  }, []);

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
      const spec = await readOpenAPIFile(file);
      processOpenAPISpec(spec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [processOpenAPISpec]);

  const handlePasteSubmit = useCallback(() => {
    if (!jsonInput.trim()) {
      setError('Please paste JSON content');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName('pasted-spec.json');

    try {
      const spec = parseJSONString(jsonInput);
      processOpenAPISpec(spec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON');
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [jsonInput, processOpenAPISpec]);

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

    if (error?.includes('select at least one')) {
      setError(null);
    }
  }, [endpoints, error]);

  const handleReset = useCallback(() => {
    setEndpoints([]);
    setError(null);
    setFileName('');
    setJsonInput('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Documentation Builder</h1>
            <p className="text-sm text-muted-foreground">
              Convert OpenAPI 3.x JSON to editable API documentation
            </p>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4">
        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              OpenAPI Specification Input
            </CardTitle>
            <CardDescription>
              Upload a JSON file or paste OpenAPI 3.x specification directly
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mode Toggle Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={inputMode === 'upload' ? 'default' : 'outline'}
                onClick={() => setInputMode('upload')}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
              <Button
                variant={inputMode === 'paste' ? 'default' : 'outline'}
                onClick={() => setInputMode('paste')}
                className="gap-2"
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste JSON
              </Button>
            </div>

            {/* Upload Mode */}
            {inputMode === 'upload' && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full h-32 px-4 transition border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-primary/50 focus:outline-none border-muted-foreground/25 bg-muted/50"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
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
            )}

            {/* Paste Mode */}
            {inputMode === 'paste' && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste your OpenAPI 3.x JSON specification here..."
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="min-h-50 font-mono text-sm"
                />
                <Button onClick={handlePasteSubmit} disabled={!jsonInput.trim() || isLoading}>
                  Parse JSON
                </Button>
              </div>
            )}

            {/* Reset button */}
            {endpoints.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Processing...
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
            <div className="mb-6 flex items-center justify-between sticky top-18 bg-background/95 backdrop-blur py-4 z-5">
              <div>
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
                Upload an OpenAPI 3.x JSON file or paste the specification directly to get started.
                The file will be parsed and displayed as editable documentation cards.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
