import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/lib/store';

interface AccountInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountInfoModal = ({ isOpen, onClose }: AccountInfoModalProps) => {
  const { t } = useTranslation(['account_info', 'common']);
  const { userData, pushUrl } = useStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common:account_info')}</DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <div className="pb-1 text-sm text-gray-600 dark:text-gray-400">{t('push_url')}</div>
          <div className="text break-all">{pushUrl}</div>
        </div>

        <div className="pt-2">
          <div className="pb-1 text-sm text-gray-600 dark:text-gray-400">
            {t('key_fingerprint')}
          </div>
          <div className="text break-all">{userData?.fingerprint ?? '??'}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
