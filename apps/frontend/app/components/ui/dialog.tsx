'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: ButtonVariant;
  cancelVariant?: ButtonVariant;
  confirmDisabled?: boolean;
  wide?: boolean;
  scrollable?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = 'accent',
  cancelVariant = 'ghost',
  confirmDisabled = false,
  wide = false,
  scrollable = false,
}: DialogProps) {
  const t = useTranslations('common');
  const resolvedCancelLabel = cancelLabel ?? t('cancel');

  if (!open) return null;

  const showDefaultFooter = footer === undefined && (onConfirm !== undefined || confirmLabel);

  return (
    <div
      className="clay-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
    >
      <div
        className={[
          'clay-modal flex flex-col w-full max-h-[90vh]',
          wide ? 'max-w-lg' : 'max-w-md',
        ].join(' ')}
      >
        {title && (
          <h2 id="dialog-title" className="font-heading text-xl font-bold text-foreground mb-4 shrink-0">
            {title}
          </h2>
        )}
        <div
          className={[
            'text-muted-foreground',
            scrollable ? 'overflow-y-auto flex-1 min-h-0' : '',
            showDefaultFooter || footer ? 'mb-6' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
        {footer}
        {showDefaultFooter && (
          <div className="flex gap-3 justify-end shrink-0 border-t border-border pt-4">
            <Button variant={cancelVariant} onClick={onClose}>
              {resolvedCancelLabel}
            </Button>
            {onConfirm && confirmLabel && (
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
