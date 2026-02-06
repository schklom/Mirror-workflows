import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from './ConfirmModal';
import { PasswordInput } from '@/components/PasswordInput';
import { toast } from 'sonner';
import { COMMANDS } from '../DevicePanel';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  executeCommand: (command: string, baseCommand: string) => void;
}

export const FactoryResetModal = ({
  isOpen,
  onClose,
  executeCommand,
}: FactoryResetModalProps) => {
  const { t } = useTranslation('modals');
  const [deletePassword, setDeletePassword] = useState('');

  return (
    <ConfirmModal
      isOpen={isOpen}
      onCancel={() => {
        onClose();
        setDeletePassword('');
      }}
      onConfirm={() => {
        if (deletePassword.trim()) {
          executeCommand(`delete ${deletePassword.trim()}`, COMMANDS.DELETE);
          setDeletePassword('');
        } else {
          toast.error(t('factory_reset.error_empty_password'));
        }
        onClose();
      }}
      title={t('factory_reset.title')}
      message={t('factory_reset.message')}
      confirmText={t('factory_reset.confirm')}
      confirmDisabled={!deletePassword.trim()}
    >
      <PasswordInput
        id="delete-pin"
        value={deletePassword}
        onChange={(e) => setDeletePassword(e.target.value)}
        placeholder={t('factory_reset.password_placeholder')}
        autoComplete="off"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t('factory_reset.password_hint')}
      </p>
    </ConfirmModal>
  );
};
