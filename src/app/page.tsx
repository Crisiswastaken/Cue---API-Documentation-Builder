'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EndpointDetailModal } from '@/components/endpoint-detail-modal';
import { EndpointSelector } from '@/components/endpoint-selector';
import { ModeToggle } from '@/components/mode-toggle';
import { SelectedEndpointsSidebar } from '@/components/selected-endpoints-sidebar';
import { createEndpointGroups, getEndpointGroupKey } from '@/lib/endpoint-grouping';
import { downloadMarkdown, generateMarkdownDocumentation } from '@/lib/markdown-generator';
import { EditableEndpoint } from '@/lib/openapi-types';
import { fetchSpecFromDocumentationUrl, parseSpecString, readSpecFile } from '@/lib/openapi-parser';
import {
  AlertCircle,
  ClipboardPaste,
  FileJson,
  Link2,
  RefreshCcw,
  Upload,
} from 'lucide-react';

type InputMode = 'upload' | 'paste' | 'url';

const FOOTER_LINKS = {
  docs: 'https://docs.cue.dev',
  github: 'https://github.com/your-org/cue',
  support: 'mailto:support@cue.dev',
};

const SPEC_PREVIEW_LIMIT = 380;

function getCollapsedPreview(content: string, limit = SPEC_PREVIEW_LIMIT): string {
  const trimmed = content.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}...`;
}

export default function DocumentationBuilderPage() {
  const [endpoints, setEndpoints] = useState<EditableEndpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceFormat, setSourceFormat] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [specInput, setSpecInput] = useState('');
  const [docsUrlInput, setDocsUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(null);
  const [openedEndpointId, setOpenedEndpointId] = useState<string | null>(null);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isSpecPreviewExpanded, setIsSpecPreviewExpanded] = useState(false);

  const selectedEndpoints = useMemo(
    () => endpoints.filter((endpoint) => endpoint.selected),
    [endpoints]
  );

  const endpointGroups = useMemo(
    () => createEndpointGroups(endpoints, searchQuery),
    [endpoints, searchQuery]
  );

  const openedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === openedEndpointId) ?? null,
    [endpoints, openedEndpointId]
  );

  const showSpecPreview = specInput.trim().length > SPEC_PREVIEW_LIMIT && !isSpecPreviewExpanded;

  const applyParsedEndpoints = useCallback(
    (
      parsedEndpoints: EditableEndpoint[] | Omit<EditableEndpoint, 'selected'>[],
      sourceName: string,
      format: string
    ) => {
      const editableEndpoints: EditableEndpoint[] = parsedEndpoints.map((endpoint) => ({
        ...endpoint,
        selected: false,
      }));

      setEndpoints(editableEndpoints);
      setSourceLabel(sourceName);
      setSourceFormat(format);
      setSearchQuery('');
      setActiveEndpointId(null);
      setOpenedEndpointId(null);
      setIsEndpointModalOpen(false);

      if (editableEndpoints.length === 0) {
        setError('No endpoints found in the provided specification.');
      }
    },
    []
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!/\.(json|ya?ml)$/i.test(file.name)) {
        setError('Please upload a supported specification file (.json, .yaml, .yml).');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const parsed = await readSpecFile(file);
        applyParsedEndpoints(parsed.endpoints, file.name, parsed.format);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Failed to process file');
        setEndpoints([]);
      } finally {
        setIsLoading(false);
      }
    },
    [applyParsedEndpoints]
  );

  const handlePasteSubmit = useCallback(() => {
    if (!specInput.trim()) {
      setError('Please paste your specification content first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsed = parseSpecString(specInput, 'pasted-spec');
      applyParsedEndpoints(parsed.endpoints, 'Pasted specification', parsed.format);
    } catch (pasteError) {
      setError(pasteError instanceof Error ? pasteError.message : 'Failed to parse specification');
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [applyParsedEndpoints, specInput]);

  const handleUrlSubmit = useCallback(async () => {
    if (!docsUrlInput.trim()) {
      setError('Please enter a documentation URL first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsed = await fetchSpecFromDocumentationUrl(docsUrlInput.trim());
      applyParsedEndpoints(parsed.endpoints, parsed.specUrl, parsed.format);
    } catch (urlError) {
      setError(urlError instanceof Error ? urlError.message : 'Failed to import from URL');
      setEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  }, [applyParsedEndpoints, docsUrlInput]);

  const handleEndpointUpdate = useCallback((updatedEndpoint: EditableEndpoint) => {
    setEndpoints((previous) =>
      previous.map((endpoint) => (endpoint.id === updatedEndpoint.id ? updatedEndpoint : endpoint))
    );
  }, []);

  const handleToggleEndpoint = useCallback((endpointId: string) => {
    setEndpoints((previous) =>
      previous.map((endpoint) =>
        endpoint.id === endpointId ? { ...endpoint, selected: !endpoint.selected } : endpoint
      )
    );
  }, []);

  const handleToggleGroup = useCallback((groupKey: string, shouldSelect: boolean) => {
    setEndpoints((previous) =>
      previous.map((endpoint) =>
        getEndpointGroupKey(endpoint) === groupKey
          ? { ...endpoint, selected: shouldSelect }
          : endpoint
      )
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setEndpoints((previous) => previous.map((endpoint) => ({ ...endpoint, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setEndpoints((previous) => previous.map((endpoint) => ({ ...endpoint, selected: false })));
  }, []);

  const handleOpenEndpointDetails = useCallback((endpointId: string) => {
    setActiveEndpointId(endpointId);
    setOpenedEndpointId(endpointId);
    setIsEndpointModalOpen(true);
  }, []);

  const handleGenerateDocumentation = useCallback(() => {
    if (selectedEndpoints.length === 0) {
      setError('Please select at least one endpoint to generate documentation.');
      return;
    }

    const markdown = generateMarkdownDocumentation(endpoints, 'Cue API Documentation');
    downloadMarkdown(markdown, 'cue-api-documentation.md');

    if (error?.includes('select at least one')) {
      setError(null);
    }
  }, [endpoints, error, selectedEndpoints.length]);

  const handleReset = useCallback(() => {
    setEndpoints([]);
    setError(null);
    setSourceLabel('');
    setSourceFormat('');
    setSpecInput('');
    setDocsUrlInput('');
    setSearchQuery('');
    setActiveEndpointId(null);
    setOpenedEndpointId(null);
    setIsEndpointModalOpen(false);
    setIsSpecPreviewExpanded(false);

    const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="fixed top-4 right-4 z-40">
        <ModeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileJson className="h-6 w-6" />
              Cue Documentation Builder
            </CardTitle>
            <CardDescription>
              Import OpenAPI/Swagger specs from file upload, direct paste, or documentation URL.
              Supported formats: OpenAPI JSON, OpenAPI YAML, Swagger JSON, and Swagger YAML.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <Button
                variant={inputMode === 'upload' ? 'default' : 'outline'}
                onClick={() => setInputMode('upload')}
                className="justify-start gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Spec File
              </Button>
              <Button
                variant={inputMode === 'paste' ? 'default' : 'outline'}
                onClick={() => setInputMode('paste')}
                className="justify-start gap-2"
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste Spec Content
              </Button>
              <Button
                variant={inputMode === 'url' ? 'default' : 'outline'}
                onClick={() => setInputMode('url')}
                className="justify-start gap-2"
              >
                <Link2 className="h-4 w-4" />
                Import From Docs URL
              </Button>
            </div>

            {inputMode === 'upload' && (
              <label
                htmlFor="file-upload"
                className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-4 text-center transition hover:border-primary/60"
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {sourceLabel || 'Click to upload .json, .yaml, or .yml specification file'}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {inputMode === 'paste' && (
              <div className="space-y-3">
                {showSpecPreview ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Specification Preview
                      </p>
                      <pre className="max-h-40 overflow-hidden whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
                        {getCollapsedPreview(specInput)}
                      </pre>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setIsSpecPreviewExpanded(true)}>
                        View Full Content
                      </Button>
                      <Button onClick={handlePasteSubmit} disabled={!specInput.trim() || isLoading}>
                        Parse Specification
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder="Paste OpenAPI or Swagger specification (JSON or YAML) here..."
                      value={specInput}
                      onChange={(event) => setSpecInput(event.target.value)}
                      onPaste={() => setIsSpecPreviewExpanded(false)}
                      className="min-h-56 font-mono text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      {specInput.trim().length > SPEC_PREVIEW_LIMIT && (
                        <Button variant="outline" onClick={() => setIsSpecPreviewExpanded(false)}>
                          Collapse Preview
                        </Button>
                      )}
                      <Button onClick={handlePasteSubmit} disabled={!specInput.trim() || isLoading}>
                        Parse Specification
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {inputMode === 'url' && (
              <div className="space-y-3">
                <Input
                  placeholder="https://yourwebsite.com/service/docs"
                  value={docsUrlInput}
                  onChange={(event) => setDocsUrlInput(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Cue will derive nearby spec paths like openapi.json/openapi.yaml/swagger.json/swagger.yaml and import the first valid one.
                </p>
                <Button onClick={handleUrlSubmit} disabled={!docsUrlInput.trim() || isLoading}>
                  Import Documentation
                </Button>
              </div>
            )}

            {endpoints.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Loaded from: <span className="font-medium text-foreground">{sourceLabel}</span>
                  {sourceFormat ? (
                    <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs uppercase">{sourceFormat}</span>
                  ) : null}
                </p>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            )}

            {isLoading && <p className="mt-4 text-sm text-muted-foreground">Processing specification...</p>}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {endpoints.length > 0 && (
          <div className="flex min-h-[calc(100vh-6rem)] gap-6">
            <div className="min-w-0 flex-1">
              <EndpointSelector
                groups={endpointGroups}
                totalCount={endpoints.length}
                selectedCount={selectedEndpoints.length}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onToggleEndpoint={handleToggleEndpoint}
                onToggleGroup={handleToggleGroup}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onActivateEndpoint={handleOpenEndpointDetails}
                activeEndpointId={activeEndpointId}
              />
            </div>

            <SelectedEndpointsSidebar
              totalEndpoints={endpoints.length}
              selectedEndpoints={selectedEndpoints}
              activeEndpointId={activeEndpointId}
              onActivateEndpoint={handleOpenEndpointDetails}
              onToggleEndpoint={handleToggleEndpoint}
              onGenerateDocumentation={handleGenerateDocumentation}
            />
          </div>
        )}

        {endpoints.length === 0 && !error && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileJson className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No API specification loaded</h3>
              <p className="max-w-lg text-muted-foreground">
                Start by uploading a specification file, pasting JSON/YAML content, or providing a documentation URL.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <EndpointDetailModal
        endpoint={openedEndpoint}
        open={isEndpointModalOpen}
        onOpenChange={setIsEndpointModalOpen}
        onUpdate={handleEndpointUpdate}
      />

      <footer className="border-t bg-muted/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Cue. Documentation Builder</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={FOOTER_LINKS.github} target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
