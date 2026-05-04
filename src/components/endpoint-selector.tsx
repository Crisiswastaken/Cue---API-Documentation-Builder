'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { EndpointGroup } from '@/lib/endpoint-grouping';

interface EndpointSelectorProps {
  groups: EndpointGroup[];
  totalCount: number;
  selectedCount: number;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onToggleEndpoint: (endpointId: string) => void;
  onToggleGroup: (groupKey: string, shouldSelect: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onActivateEndpoint: (endpointId: string) => void;
  activeEndpointId: string | null;
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

export function EndpointSelector({
  groups,
  totalCount,
  selectedCount,
  searchQuery,
  onSearchQueryChange,
  onToggleEndpoint,
  onToggleGroup,
  onSelectAll,
  onDeselectAll,
  onActivateEndpoint,
  activeEndpointId,
}: EndpointSelectorProps) {
  return (
    <Card className="sticky top-20 z-20 mb-6 max-h-[calc(100vh-6rem)] overflow-hidden border-2">
      <CardHeader className=" space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Endpoint Catalog ({selectedCount}/{totalCount} selected)</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search by path, method, summary, or tag"
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="overflow-y-auto endpoint-modal-scroll">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No endpoints match the current search query.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const allSelected = group.endpoints.length > 0 && group.selectedCount === group.endpoints.length;

              return (
                <section key={group.key} className="  rounded-lg border bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${group.key}`}
                        checked={allSelected}
                        onCheckedChange={(checked) => onToggleGroup(group.key, checked === true)}
                      />
                      <Label htmlFor={`group-${group.key}`} className="cursor-pointer font-semibold">
                        {group.label} ({group.selectedCount}/{group.endpoints.length})
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleGroup(group.key, !allSelected)}
                    >
                      {allSelected ? 'Clear Group' : 'Select Group'}
                    </Button>
                  </div>

                  <div className="endpoint-modal-scroll max-h-60 space-y-2 overflow-y-auto pr-1">
                    {group.endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`rounded-md border p-2 transition ${
                          endpoint.id === activeEndpointId ? 'border-primary bg-primary/5' : 'hover:bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`selector-${endpoint.id}`}
                            checked={endpoint.selected}
                            onCheckedChange={() => onToggleEndpoint(endpoint.id)}
                          />
                          <button
                            type="button"
                            onClick={() => onActivateEndpoint(endpoint.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <Badge className={`${METHOD_COLORS[endpoint.method] ?? 'bg-zinc-500'} text-white text-xs`}>
                              {endpoint.method}
                            </Badge>
                            <span className="truncate font-mono text-sm">{endpoint.path}</span>
                          </button>
                        </div>
                        {endpoint.summary && (
                          <p className="mt-1 line-clamp-1 pl-7 text-xs text-muted-foreground">{endpoint.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
