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
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  children,
  confirmDisabled = false,
}: ConfirmModalProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => !open && onCancel && onCancel()}
  >
    <DialogContent className="sm:max-w-md" showCloseButton={false}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-950">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <DialogTitle className="text-red-600 dark:text-red-400">
            {title}
          </DialogTitle>
        </div>

        {message && <DialogDescription>{message}</DialogDescription>}
      </DialogHeader>

      {children && <div className="py-4">{children}</div>}

      <DialogFooter className="gap-3 sm:gap-3">
        {onCancel && (
          <Button onClick={onCancel} variant="outline" className="flex-1">
            {cancelText}
          </Button>
        )}

        <Button
          onClick={() => {
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
