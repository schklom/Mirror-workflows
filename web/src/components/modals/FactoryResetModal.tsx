import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { PasswordInput } from '@/components/PasswordInput';
import { toast } from 'sonner';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  executeCommand: (cmd: string) => void;
}

export const FactoryResetModal = ({
  isOpen,
  onClose,
  executeCommand,
}: FactoryResetModalProps) => {
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
          executeCommand(`delete ${deletePassword.trim()}`);
          setDeletePassword('');
        } else {
          toast.error('Please enter your delete password');
        }
        onClose();
      }}
      title="Factory reset the device?"
      message="This will permanently delete all data from your device and restore it to factory settings. This action cannot be undone."
      confirmText="Factory reset"
      confirmDisabled={!deletePassword.trim()}
    >
      <PasswordInput
        id="delete-pin"
        value={deletePassword}
        onChange={(e) => setDeletePassword(e.target.value)}
        placeholder="Enter your delete password"
        autoComplete="off"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        This is the password configured in your FMD Android app, not your server
        password.
      </p>
    </ConfirmModal>
  );
};
