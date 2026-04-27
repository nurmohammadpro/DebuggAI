/**
 * Input Dialog - Custom prompt dialog replacement
 *
 * Replaces native prompt() with a styled modal dialog
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'number';
  onSubmit: (value: string) => void;
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  defaultValue = '',
  type = 'text',
  onSubmit,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue('');
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#E8F5E9]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[#8BAD8B]">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <Input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-[#171C17] border-[#283228] text-[#E8F5E9] placeholder:text-[#4D6B4D] focus:border-[#00C853]"
          autoFocus
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#283228] text-[#8BAD8B] hover:bg-[#1F2B1F] hover:text-[#E8F5E9]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="bg-[#00C853] text-black hover:bg-[#00E676]"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for using InputDialog
 */
export function useInputDialog() {
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    type?: 'text' | 'number';
    resolve?: (value: string | null) => void;
  }>({
    open: false,
    title: '',
  });

  const prompt = (
    title: string,
    description?: string,
    placeholder?: string,
    defaultValue = '',
    type: 'text' | 'number' = 'text'
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        title,
        description,
        placeholder,
        defaultValue,
        type,
        resolve,
      });
    });
  };

  const handleConfirm = (value: string) => {
    dialog.resolve?.(value);
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    dialog.resolve?.(null);
    setDialog((prev) => ({ ...prev, open: false }));
  };

  const InputDialogComponent = () => (
    <InputDialog
      open={dialog.open}
      onOpenChange={handleCancel}
      title={dialog.title}
      description={dialog.description}
      placeholder={dialog.placeholder}
      defaultValue={dialog.defaultValue}
      type={dialog.type}
      onSubmit={handleConfirm}
    />
  );

  return { prompt, InputDialogComponent };
}
