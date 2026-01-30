import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Input } from '../ui/input';

interface LockMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  executeCommand: (cmd: string) => void;
}

export const LockMessageModal = ({
  isOpen,
  onClose,
  executeCommand,
}: LockMessageModalProps) => {
  const [message, setMessage] = useState('');

  return (
    <ConfirmModal
      isOpen={isOpen}
      onCancel={() => {
        setMessage('');
        onClose();
      }}
      onConfirm={() => {
        executeCommand(`lock ${message.trim()}`);
        setMessage('');
        onClose();
      }}
      title="Lock the device?"
      message="After the device has been locked, your device PIN or password is required to unlock the device. Biometric unlock won't work until the PIN or password is entered."
      confirmText="Lock"
      variant="default"
    >
      <Input
        id="lockmessage"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message"
        autoComplete="off"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Enter a message to show on the lockscreen. If you leave this empty, the
        message that is configured in the FMD Android settings will be shown on
        the lockscreen instead.
      </p>
    </ConfirmModal>
  );
};
