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
  const [deletePin, setDeletePin] = useState('');

  return (
    <ConfirmModal
      isOpen={isOpen}
      onCancel={() => {
        onClose();
        setDeletePin('');
      }}
      onConfirm={() => {
        if (deletePin.trim()) {
          executeCommand(`delete ${deletePin.trim()}`);
          setDeletePin('');
        } else {
          toast.error('Please enter your device PIN');
        }
        onClose();
      }}
      title="Factory reset the device?"
      message="This will permanently delete all data from your device and restore it to factory settings. This action cannot be undone."
      confirmText="Factory reset"
      confirmDisabled={!deletePin.trim()}
    >
      <PasswordInput
        id="delete-pin"
        value={deletePin}
        onChange={(e) => setDeletePin(e.target.value)}
        placeholder="Enter your device PIN"
        autoComplete="off"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        This is the PIN configured in your FMD Android app, not your server
        password.
      </p>
    </ConfirmModal>
  );
};
