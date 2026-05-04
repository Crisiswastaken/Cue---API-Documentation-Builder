'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditableEndpoint, Parameter } from '@/lib/openapi-types';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EndpointCardProps {
  endpoint: EditableEndpoint;
  onUpdate: (updatedEndpoint: EditableEndpoint) => void;
  isActive?: boolean;
  domIdPrefix?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
  OPTIONS: 'bg-gray-500',
  HEAD: 'bg-violet-500',
};

const PREVIEW_MAX_CHARS = 240;

function compactPreview(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= PREVIEW_MAX_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, PREVIEW_MAX_CHARS)}...`;
}

export function EndpointCard({
  endpoint,
  onUpdate,
  isActive = false,
  domIdPrefix = 'endpoint-card',
}: EndpointCardProps) {
  const [requestExpanded, setRequestExpanded] = useState(false);
  const [responseExpanded, setResponseExpanded] = useState(false);

  const requestPreview = useMemo(() => compactPreview(endpoint.requestBody), [endpoint.requestBody]);
  const responsePreview = useMemo(() => compactPreview(endpoint.responseBody), [endpoint.responseBody]);

  const handleFieldChange = (field: keyof EditableEndpoint, value: string | boolean) => {
    onUpdate({ ...endpoint, [field]: value });
  };

  const handleParameterChange = (index: number, field: keyof Parameter, value: string | boolean) => {
    const updatedParams = [...endpoint.parameters];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    onUpdate({ ...endpoint, parameters: updatedParams });
  };

  const handleAddParameter = () => {
    const newParam: Parameter = {
      name: 'newParam',
      location: 'query',
      type: 'string',
      required: false,
    };
    onUpdate({ ...endpoint, parameters: [...endpoint.parameters, newParam] });
  };

  const handleRemoveParameter = (index: number) => {
    const updatedParams = endpoint.parameters.filter((_, i) => i !== index);
    onUpdate({ ...endpoint, parameters: updatedParams });
  };

  return (
    <Card
      id={`${domIdPrefix}-${encodeURIComponent(endpoint.id)}`}
      className={cn('mb-6 scroll-mt-32 transition-shadow', isActive && 'shadow-lg')}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge className={`${METHOD_COLORS[endpoint.method] ?? 'bg-zinc-500'} text-white`}>
                {endpoint.method}
              </Badge>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{endpoint.path}</code>
            </div>
            <CardTitle className="text-lg">
              <Input
                value={endpoint.summary}
                onChange={(event) => handleFieldChange('summary', event.target.value)}
                placeholder="Enter endpoint summary..."
                className="font-semibold"
              />
            </CardTitle>
            {endpoint.tags.length > 0 && (
              <CardDescription className="mt-2">Tags: {endpoint.tags.join(', ')}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`select-${endpoint.id}`}
              checked={endpoint.selected}
              onCheckedChange={(checked) => handleFieldChange('selected', checked as boolean)}
            />
            <Label htmlFor={`select-${endpoint.id}`} className="cursor-pointer">
              Include
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {endpoint.description !== undefined && (
          <div>
            <Label className="mb-2 block text-sm font-semibold">Description</Label>
            <Textarea
              value={endpoint.description || ''}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              placeholder="Enter description..."
              rows={2}
            />
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-semibold">Parameters</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddParameter} className="h-8">
              <Plus className="mr-1 h-4 w-4" />
              Add Parameter
            </Button>
          </div>

          {endpoint.parameters.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No parameters</p>
          ) : (
            <div className="space-y-3">
              {endpoint.parameters.map((param, index) => (
                <div key={index} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-4">
                    <Input
                      value={param.name}
                      onChange={(event) => handleParameterChange(index, 'name', event.target.value)}
                      placeholder="Name"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={param.type}
                      onChange={(event) => handleParameterChange(index, 'type', event.target.value)}
                      placeholder="Type"
                      className="text-sm"
                    />
                    <select
                      value={param.location}
                      onChange={(event) => handleParameterChange(index, 'location', event.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="query">query</option>
                      <option value="path">path</option>
                      <option value="header">header</option>
                      <option value="cookie">cookie</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`param-required-${endpoint.id}-${index}`}
                        checked={param.required}
                        onCheckedChange={(checked) => handleParameterChange(index, 'required', checked as boolean)}
                      />
                      <Label htmlFor={`param-required-${endpoint.id}-${index}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveParameter(index)}
                    className="h-10 text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {endpoint.authHeader && (
          <div>
            <Label className="mb-2 block text-sm font-semibold">Authentication</Label>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Label className="w-20 text-sm">Type:</Label>
                <Badge variant="outline">{endpoint.authHeader.type}</Badge>
              </div>
              {endpoint.authHeader.name && (
                <div className="flex items-center gap-2">
                  <Label className="w-20 text-sm">Header:</Label>
                  <code className="text-sm">{endpoint.authHeader.name}</code>
                </div>
              )}
              {endpoint.authHeader.description && (
                <p className="text-sm text-muted-foreground">{endpoint.authHeader.description}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-semibold">Request Body</Label>
            {endpoint.requestBody.trim() && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRequestExpanded((value) => !value)}>
                {requestExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" />
                    View Full JSON
                  </>
                )}
              </Button>
            )}
          </div>

          {!endpoint.requestBody.trim() || requestExpanded ? (
            <Textarea
              value={endpoint.requestBody}
              onChange={(event) => handleFieldChange('requestBody', event.target.value)}
              placeholder="Enter request body JSON..."
              rows={8}
              className="font-mono text-sm"
            />
          ) : (
            <pre className="max-h-32 overflow-hidden rounded-md border bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
              {requestPreview}
            </pre>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-semibold">Response Body</Label>
            {endpoint.responseBody.trim() && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setResponseExpanded((value) => !value)}>
                {responseExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" />
                    View Full JSON
                  </>
                )}
              </Button>
            )}
          </div>

          {!endpoint.responseBody.trim() || responseExpanded ? (
            <Textarea
              value={endpoint.responseBody}
              onChange={(event) => handleFieldChange('responseBody', event.target.value)}
              placeholder="Enter response body JSON..."
              rows={8}
              className="font-mono text-sm"
            />
          ) : (
            <pre className="max-h-32 overflow-hidden rounded-md border bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
              {responsePreview}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
