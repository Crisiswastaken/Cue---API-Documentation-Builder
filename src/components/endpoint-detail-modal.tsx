'use client';

import React from 'react';
import { EndpointCard } from '@/components/endpoint-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditableEndpoint } from '@/lib/openapi-types';

interface EndpointDetailModalProps {
  endpoint: EditableEndpoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedEndpoint: EditableEndpoint) => void;
}

export function EndpointDetailModal({
  endpoint,
  open,
  onOpenChange,
  onUpdate,
}: EndpointDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Endpoint Details</DialogTitle>
          <DialogDescription>
            Edit this endpoint and add to documentation.
          </DialogDescription>
        </DialogHeader>
        <div className="endpoint-modal-scroll max-h-[calc(90vh-8.5rem)] overflow-y-auto px-4 pb-4">
          {endpoint ? (
            <EndpointCard
              endpoint={endpoint}
              onUpdate={onUpdate}
              isActive
              domIdPrefix="endpoint-modal-card"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No endpoint selected.</p>
          )}
        </div>
        <DialogFooter className="border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
