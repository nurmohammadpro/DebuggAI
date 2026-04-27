/**
 * Confirm Dialog - Custom confirm dialog replacement
 *
 * Replaces native confirm() with a styled modal dialog
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
      <AlertDialogContent className="bg-[#111411] border-[#1F2B1F]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#E8F5E9]">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-[#8BAD8B]">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={`border-[#283228] text-[#8BAD8B] hover:bg-[#1F2B1F] hover:text-[#E8F5E9]`}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`${
              variant === 'destructive'
                ? 'bg-[#FF5252] text-white hover:bg-[#FF7B7B]'
                : 'bg-[#00C853] text-black hover:bg-[#00E676]'
            }`}
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
