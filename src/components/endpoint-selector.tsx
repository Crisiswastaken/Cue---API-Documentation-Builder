'use client';

/**
 * EndpointSelector Component
 * Compact selection panel showing all endpoints with checkboxes
 * Syncs with individual endpoint cards
 * Can be minimized to avoid blocking content
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EditableEndpoint } from '@/lib/openapi-types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EndpointSelectorProps {
  endpoints: EditableEndpoint[];
  onToggleEndpoint: (endpointId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
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

export function EndpointSelector({
  endpoints,
  onToggleEndpoint,
  onSelectAll,
  onDeselectAll,
}: EndpointSelectorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const selectedCount = endpoints.filter((e) => e.selected).length;
  const totalCount = endpoints.length;

  return (
    <Card className="sticky bottom-4 shadow-lg border-2 z-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Endpoint Selection ({selectedCount}/{totalCount})
          </CardTitle>
          <div className="flex gap-2">
            {!isCollapsed && (
              <>
                <Button variant="outline" size="sm" onClick={onSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={onDeselectAll}>
                  Deselect All
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-2"
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Minimize
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`selector-${endpoint.id}`}
                  checked={endpoint.selected}
                  onCheckedChange={() => onToggleEndpoint(endpoint.id)}
                />
                <Label
                  htmlFor={`selector-${endpoint.id}`}
                  className="flex-1 flex items-center gap-2 cursor-pointer"
                >
                  <Badge className={`${METHOD_COLORS[endpoint.method]} text-white text-xs`}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-mono">{endpoint.path}</code>
                  {endpoint.summary && (
                    <span className="text-sm text-muted-foreground truncate">
                      - {endpoint.summary}
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
