/**
 * Confirm Dialog - Custom confirm dialog replacement
 *
 * Replaces native confirm() with a styled modal dialog using V03 patterns.
 */

'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-sm font-medium text-[var(--app-text)]">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm font-light text-[var(--app-text-muted)]">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <AlertDialogCancel
            className="rounded-[8px] border-0 bg-transparent px-4 py-2 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === 'destructive'
                ? 'rounded-[8px] bg-[var(--app-danger)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90'
                : 'rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-black transition-colors hover:opacity-90'
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for using ConfirmDialog
 */
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    resolve?: (confirmed: boolean) => void;
  }>({
    open: false,
    title: '',
  });

  const confirm = (
    title: string,
    description?: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: 'default' | 'destructive';
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        title,
        description,
        ...options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    dialog.resolve?.(true);
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    dialog.resolve?.(false);
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={dialog.open}
      onOpenChange={handleCancel}
      title={dialog.title}
      description={dialog.description}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      variant={dialog.variant}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
}
