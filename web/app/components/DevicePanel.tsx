'use client';

import { sendCommand, getPushUrl } from '../lib/api';
import { sign } from '../lib/crypto';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  Navigation,
  History,
  Volume2,
  Lock,
  Trash2,
  Camera,
  UserCircle,
  ChevronRight,
  ChevronLeft,
  Smartphone,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ActionItem } from '@/components/ActionItem';
import { BatteryIndicator } from '@/components/BatteryIndicator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Location } from '@/lib/api';

interface DevicePanelProps {
  sessionToken: string;
  rsaSigKey: CryptoKey;
  onViewPhotos: () => void;
  onLocateCommand?: () => void;
  loadingLocation?: boolean;
  locations?: Location[];
  currentLocationIndex?: number;
  onSelectLocation?: (index: number) => void;
}

const COMMANDS = {
  LOCATE_ALL: 'locate',
  LOCATE_GPS: 'locate gps',
  LOCATE_CELL: 'locate cell',
  LOCATE_LAST: 'locate last',
  RING: 'ring',
  LOCK: 'lock',
  DELETE: 'delete',
  CAMERA_FRONT: 'picture front',
  CAMERA_BACK: 'picture back',
} as const;

const COMMAND_SUCCESS_MESSAGES: Record<string, string> = {
  [COMMANDS.LOCATE_ALL]: 'Requesting fresh location...',
  [COMMANDS.LOCATE_LAST]: 'Requesting last known location...',
  [COMMANDS.RING]: 'Ring command sent successfully',
  [COMMANDS.LOCK]: 'Lock command sent successfully',
  [COMMANDS.DELETE]: 'Factory reset command sent',
  [COMMANDS.CAMERA_FRONT]: 'Front camera photo requested',
  [COMMANDS.CAMERA_BACK]: 'Back camera photo requested',
};

export const DevicePanel = ({
  sessionToken,
  rsaSigKey,
  onLocateCommand,
  onViewPhotos,
  loadingLocation,
  locations = [],
  currentLocationIndex = 0,
  onSelectLocation,
}: DevicePanelProps) => {
  const [loading, setLoading] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [pushUrl, setPushUrl] = useState<string | undefined>(undefined);
  const [pushUrlLoading, setPushUrlLoading] = useState(true);

  useEffect(() => {
    setPushUrlLoading(true);
    void getPushUrl(sessionToken)
      .then(setPushUrl)
      .finally(() => setPushUrlLoading(false));
  }, [sessionToken]);

  const executeCommand = async (command: string) => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const signature = await sign(rsaSigKey, `${timestamp}:${command}`);

      if (command.startsWith('locate') && onLocateCommand) {
        onLocateCommand();
      }
      await sendCommand(sessionToken, command, signature, timestamp);

      const successMessage =
        COMMAND_SUCCESS_MESSAGES[command] || 'Command sent successfully';
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Command failed');
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    {
      icon: Navigation,
      title: 'Locate',
      description: 'Get fresh location from GPS/network',
      onClick: () => void executeCommand(COMMANDS.LOCATE_ALL),
    },
    {
      icon: History,
      title: 'Last Known',
      description: 'Get cached location (faster, may be outdated)',
      onClick: () => void executeCommand(COMMANDS.LOCATE_LAST),
    },
    {
      icon: Volume2,
      title: 'Ring',
      description: 'Play a loud sound on the device',
      onClick: () => void executeCommand(COMMANDS.RING),
    },
    {
      icon: Lock,
      title: 'Lock',
      description: 'Lock the device screen',
      onClick: () => void executeCommand(COMMANDS.LOCK),
    },
    {
      icon: Trash2,
      title: 'Factory Reset',
      description: 'Wipe all data and reset device to factory settings',
      onClick: () => setShowFactoryResetConfirm(true),
      variant: 'destructive' as const,
    },
    {
      icon: UserCircle,
      title: 'Front Camera',
      description: 'Take a photo with the front camera',
      onClick: () => void executeCommand(COMMANDS.CAMERA_FRONT),
    },
    {
      icon: Camera,
      title: 'Back Camera',
      description: 'Take a photo with the back camera',
      onClick: () => void executeCommand(COMMANDS.CAMERA_BACK),
    },
    {
      icon: Camera,
      title: 'View Photos',
      description: 'View photos taken by the device',
      onClick: onViewPhotos,
    },
  ];

  const currentLocation = locations[currentLocationIndex];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="dark:border-fmd-dark-border dark:bg-fmd-dark rounded-lg border border-gray-200 bg-white p-4">
        {loadingLocation && (
          <div className="flex h-18 items-center justify-center">
            <Spinner />
          </div>
        )}
        {!loadingLocation && currentLocation && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-fmd-green/10 rounded-full p-3">
                <Smartphone className="text-fmd-green h-6 w-6" />
              </div>
              <div className="flex-1">
                <BatteryIndicator percentage={currentLocation.bat} />
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Last contact
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(currentLocation.date).toLocaleString()}
                </div>
              </div>
            </div>
            {locations.length > 1 && onSelectLocation && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 font-semibold"
                  onClick={() =>
                    onSelectLocation(Math.max(0, currentLocationIndex - 1))
                  }
                  disabled={currentLocationIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Older
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 font-semibold"
                  onClick={() =>
                    onSelectLocation(
                      Math.min(locations.length - 1, currentLocationIndex + 1)
                    )
                  }
                  disabled={currentLocationIndex === locations.length - 1}
                >
                  Newer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        {!loadingLocation && !currentLocation && (
          <div className="flex h-18 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            No location data yet
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-track]:bg-transparent">
        {!pushUrlLoading && !pushUrl && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No push URL configured. The device will not receive commands until
              you set up push notifications in the Android app.
            </p>
          </div>
        )}

        <div className="dark:border-fmd-dark-border dark:bg-fmd-dark rounded-lg border border-gray-200 bg-white">
          {actions.map((action, index) => (
            <ActionItem
              key={index}
              icon={action.icon}
              title={action.title}
              description={action.description}
              onClick={action.onClick}
              disabled={loading}
              variant={action.variant}
            />
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={showFactoryResetConfirm}
        onClose={() => setShowFactoryResetConfirm(false)}
        onConfirm={() => void executeCommand(COMMANDS.DELETE)}
        title="Factory Reset Device?"
        message="This will permanently delete all data from your device and restore it to factory settings. This action cannot be undone."
        confirmText="Factory Reset"
      />
    </div>
  );
};
