'use client';

/**
 * EndpointCard Component
 * Fully editable card for a single API endpoint
 * All sections can be modified by the user
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditableEndpoint, Parameter } from '@/lib/openapi-types';
import { Trash2, Plus } from 'lucide-react';

interface EndpointCardProps {
  endpoint: EditableEndpoint;
  onUpdate: (updatedEndpoint: EditableEndpoint) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
  OPTIONS: 'bg-gray-500',
  HEAD: 'bg-purple-500',
};

export function EndpointCard({ endpoint, onUpdate }: EndpointCardProps) {
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
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${METHOD_COLORS[endpoint.method]} text-white`}>
                {endpoint.method}
              </Badge>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {endpoint.path}
              </code>
            </div>
            <CardTitle className="text-lg">
              <Input
                value={endpoint.summary}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                placeholder="Enter endpoint summary..."
                className="font-semibold"
              />
            </CardTitle>
            {endpoint.tags.length > 0 && (
              <CardDescription className="mt-2">
                Tags: {endpoint.tags.join(', ')}
              </CardDescription>
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
        {/* Description */}
        {endpoint.description !== undefined && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">Description</Label>
            <Textarea
              value={endpoint.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Enter description..."
              rows={2}
            />
          </div>
        )}

        {/* Parameters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Parameters</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddParameter}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </div>
          {endpoint.parameters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No parameters</p>
          ) : (
            <div className="space-y-3">
              {endpoint.parameters.map((param, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input
                      value={param.name}
                      onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={param.type}
                      onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                      placeholder="Type"
                      className="text-sm"
                    />
                    <select
                      value={param.location}
                      onChange={(e) => handleParameterChange(index, 'location', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="query">query</option>
                      <option value="path">path</option>
                      <option value="header">header</option>
                      <option value="cookie">cookie</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`param-required-${index}`}
                        checked={param.required}
                        onCheckedChange={(checked) =>
                          handleParameterChange(index, 'required', checked as boolean)
                        }
                      />
                      <Label htmlFor={`param-required-${index}`} className="text-sm">
                        Required
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveParameter(index)}
                    className="h-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth Header */}
        {endpoint.authHeader && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">Authentication</Label>
            <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm w-20">Type:</Label>
                <Badge variant="outline">{endpoint.authHeader.type}</Badge>
              </div>
              {endpoint.authHeader.name && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm w-20">Header:</Label>
                  <code className="text-sm">{endpoint.authHeader.name}</code>
                </div>
              )}
              {endpoint.authHeader.description && (
                <p className="text-sm text-muted-foreground">{endpoint.authHeader.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Request Body */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Request Body</Label>
          <Textarea
            value={endpoint.requestBody}
            onChange={(e) => handleFieldChange('requestBody', e.target.value)}
            placeholder="Enter request body JSON..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* Response Body */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Response Body</Label>
          <Textarea
            value={endpoint.responseBody}
            onChange={(e) => handleFieldChange('responseBody', e.target.value)}
            placeholder="Enter response body JSON..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
