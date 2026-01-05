'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  children,
  confirmDisabled = false,
}: ConfirmModalProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-950">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle>{title}</DialogTitle>
        </div>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      {children && <div className="py-4">{children}</div>}
      <DialogFooter className="gap-3 sm:gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          {cancelText}
        </Button>
        <Button
          onClick={() => {
            onClose();
            onConfirm();
          }}
          variant={variant}
          className="flex-1"
          disabled={confirmDisabled}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
