import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '../ui/spinner';

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
}

export const LoadingModal = ({
  isOpen,
  title,
  message = '',
}: LoadingModalProps) => {
  const { t } = useTranslation('modals');
  title = title ?? t('loading.title');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Spinner size="sm" />

            <DialogTitle>{title}</DialogTitle>
          </div>

          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
