'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EditableEndpoint } from '@/lib/openapi-types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, ListTree, X } from 'lucide-react';

interface SelectedEndpointsSidebarProps {
  totalEndpoints: number;
  selectedEndpoints: EditableEndpoint[];
  activeEndpointId: string | null;
  onActivateEndpoint: (endpointId: string) => void;
  onToggleEndpoint: (endpointId: string) => void;
  onGenerateDocumentation: () => void;
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

export function SelectedEndpointsSidebar({
  totalEndpoints,
  selectedEndpoints,
  activeEndpointId,
  onActivateEndpoint,
  onToggleEndpoint,
  onGenerateDocumentation,
}: SelectedEndpointsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasSelection = selectedEndpoints.length > 0;

  return (
    <>
      <div
        className={cn(
          'sticky top-20 hidden shrink-0 self-start transition-[width,opacity] duration-300 lg:block',
          hasSelection ? (isCollapsed ? 'w-16 opacity-100' : 'w-80 opacity-100') : 'w-0 opacity-0'
        )}
      >
        <div className="flex h-[calc(100vh-6rem)] flex-col gap-3">
          {!isCollapsed && (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Endpoints ({totalEndpoints})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Endpoints are deselected by default. Select the ones you want in generated documentation.
                </p>
                <Button
                  onClick={onGenerateDocumentation}
                  className="w-full gap-2"
                  disabled={selectedEndpoints.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Generate Documentation
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="min-h-0 flex-1 border-2">
            <CardHeader className={cn('pb-2', isCollapsed && 'pt-3')}>
              <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
                {!isCollapsed && <CardTitle className="text-base">Selected ({selectedEndpoints.length})</CardTitle>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed((value) => !value)}
                  className={cn(isCollapsed && 'mx-auto')}
                  aria-label={isCollapsed ? 'Expand selected endpoints sidebar' : 'Collapse selected endpoints sidebar'}
                >
                  {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-full min-h-0 overflow-hidden pb-3">
              {isCollapsed ? (
                <div className="flex h-full flex-col items-center justify-start gap-3 pt-2">
                  <ListTree className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
                    Selected
                  </span>
                </div>
              ) : (
                <div className="h-full space-y-2 overflow-y-auto pr-1">
                  {selectedEndpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className={cn(
                        'rounded-md border p-2 transition',
                        endpoint.id === activeEndpointId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onActivateEndpoint(endpoint.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Badge className={`${METHOD_COLORS[endpoint.method] ?? 'bg-zinc-500'} text-white text-xs`}>
                            {endpoint.method}
                          </Badge>
                          <span className="truncate font-mono text-xs">{endpoint.path}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onToggleEndpoint(endpoint.id)}
                          aria-label={`Deselect ${endpoint.method} ${endpoint.path}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {endpoint.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{endpoint.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {hasSelection && (
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <Button onClick={() => setMobileOpen(true)} className="rounded-full shadow-lg">
            Selected ({selectedEndpoints.length})
          </Button>
        </div>
      )}

      <Sheet open={hasSelection && mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-sm p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Selected Endpoints ({selectedEndpoints.length})</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 border-b p-4">
            <div>
              <p className="text-sm font-semibold">Endpoints ({totalEndpoints})</p>
              <p className="text-xs text-muted-foreground">
                Endpoints are deselected by default. Select the ones you want in generated documentation.
              </p>
            </div>
            <Button onClick={onGenerateDocumentation} className="w-full gap-2" disabled={selectedEndpoints.length === 0}>
              <Download className="h-4 w-4" />
              Generate Documentation
            </Button>
          </div>
          <div className="h-full space-y-2 overflow-y-auto p-4">
            {selectedEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className={cn(
                  'rounded-md border p-2 transition',
                  endpoint.id === activeEndpointId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onActivateEndpoint(endpoint.id);
                      setMobileOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Badge className={`${METHOD_COLORS[endpoint.method] ?? 'bg-zinc-500'} text-white text-xs`}>
                      {endpoint.method}
                    </Badge>
                    <span className="truncate font-mono text-xs">{endpoint.path}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onToggleEndpoint(endpoint.id)}
                    aria-label={`Deselect ${endpoint.method} ${endpoint.path}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {endpoint.summary && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{endpoint.summary}</p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
