import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from './ConfirmModal';
import { Input } from '../ui/input';
import { COMMANDS } from '../DevicePanel';

interface LockMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  executeCommand: (command: string, baseCommand: string) => void;
}

export const LockMessageModal = ({
  isOpen,
  onClose,
  executeCommand,
}: LockMessageModalProps) => {
  const { t } = useTranslation('modals');
  const [message, setMessage] = useState('');

  return (
    <ConfirmModal
      isOpen={isOpen}
      onCancel={() => {
        setMessage('');
        onClose();
      }}
      onConfirm={() => {
        executeCommand(`lock ${message.trim()}`, COMMANDS.LOCK);
        setMessage('');
        onClose();
      }}
      title={t('lock.title')}
      message={t('lock.message')}
      confirmText={t('lock.confirm')}
      variant="default"
    >
      <Input
        id="lockmessage"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('lock.message_placeholder')}
        autoComplete="off"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t('lock.message_hint')}
      </p>
    </ConfirmModal>
  );
};
