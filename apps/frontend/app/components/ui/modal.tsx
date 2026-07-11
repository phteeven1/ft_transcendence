'use client';

import { ReactNode } from 'react';
import { Button } from './button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  confirmLabel?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  confirmLabel = 'OK',
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="clay-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className="clay-modal w-full max-w-md">
        {title && (
          <h2 id="modal-title" className="font-heading text-xl font-bold text-foreground mb-4">
            {title}
          </h2>
        )}
        <div className="text-muted-foreground mb-6">{children}</div>
        <div className="flex justify-end">
          <Button variant="accent" onClick={onClose}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
