import { sendCommand, getPushUrl } from '../lib/api';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  Navigation,
  RadioTower,
  History,
  Volume2,
  Flashlight,
  Lock,
  Trash2,
  Camera,
  UserCircle,
  Image,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Bluetooth,
  BluetoothOff,
  Satellite,
  Bell,
  BellOff,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { ActionItem } from '@/components/ActionItem';
import { BatteryIndicator } from '@/components/BatteryIndicator';
import { PasswordInput } from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Across this file and the UI, commands are ordered by perceived importance.
// If you change the order in one place, make sure to keep it aligned everywhere!

const COMMANDS = {
  LOCATE_ALL: 'locate all',
  LOCATE_FUSED: 'locate fused',
  LOCATE_GPS: 'locate gps',
  LOCATE_CELL: 'locate cell',
  LOCATE_LAST: 'locate last',
  RING: 'ring',
  FLASH: 'flash',
  LOCK: 'lock',
  DELETE: 'delete',
  CAMERA_FRONT: 'camera front',
  CAMERA_BACK: 'camera back',
  BLUETOOTH_ON: 'bluetooth on',
  BLUETOOTH_OFF: 'bluetooth off',
  GPS_ON: 'gps on',
  GPS_OFF: 'gps off',
  RINGERMODE_NORMAL: 'ringermode normal',
  RINGERMODE_VIBRATE: 'ringermode vibrate',
  RINGERMODE_SILENT: 'ringermode silent',
  NODISTURB_ON: 'nodisturb on',
  NODISTURB_OFF: 'nodisturb off',
} as const;

const COMMAND_SUCCESS_MESSAGES: Record<string, string> = {
  [COMMANDS.LOCATE_ALL]: 'Requesting location...',
  [COMMANDS.LOCATE_FUSED]: 'Requesting location...',
  [COMMANDS.LOCATE_GPS]: 'Requesting location...',
  [COMMANDS.LOCATE_CELL]: 'Requesting location...',
  [COMMANDS.LOCATE_LAST]: 'Requesting last known location...',
  [COMMANDS.RING]: 'Ringing device...',
  [COMMANDS.FLASH]: 'Flashing torch light...',
  [COMMANDS.LOCK]: 'Locking device...',
  [COMMANDS.DELETE]: 'Factory reset initiated',
  [COMMANDS.CAMERA_FRONT]: 'Capturing photo...',
  [COMMANDS.CAMERA_BACK]: 'Capturing photo...',
  [COMMANDS.BLUETOOTH_ON]: 'Enabling Bluetooth...',
  [COMMANDS.BLUETOOTH_OFF]: 'Disabling Bluetooth...',
  [COMMANDS.GPS_ON]: 'Enabling Location Services...',
  [COMMANDS.GPS_OFF]: 'Disabling Location Services...',
  [COMMANDS.RINGERMODE_NORMAL]: 'Setting ringer to normal...',
  [COMMANDS.RINGERMODE_VIBRATE]: 'Setting ringer to vibrate...',
  [COMMANDS.RINGERMODE_SILENT]: 'Setting ringer to silent...',
  [COMMANDS.NODISTURB_ON]: 'Enabling Do Not Disturb...',
  [COMMANDS.NODISTURB_OFF]: 'Disabling Do Not Disturb...',
};

interface DevicePanelProps {
  onViewPhotos: () => void;
  onLocateCommand?: () => void;
}

export const DevicePanel = ({
  onLocateCommand,
  onViewPhotos,
}: DevicePanelProps) => {
  const {
    userData,
    locations,
    isLocationsLoading,
    pushUrl,
    isPushUrlLoading,
    currentLocationIndex,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState('');

  useEffect(() => {
    if (!userData) return;
    const fetchPushUrl = async () => {
      useStore.setState({ isPushUrlLoading: true });
      try {
        const url = await getPushUrl(userData.sessionToken);
        useStore.setState({ pushUrl: url });
      } catch {
        useStore.setState({ pushUrl: null });
      } finally {
        useStore.setState({ isPushUrlLoading: false });
      }
    };
    void fetchPushUrl();
  }, [userData]);

  const executeCommand = async (command: string) => {
    if (!userData) return;

    setLoading(true);
    try {
      if (command.startsWith('locate') && onLocateCommand) {
        onLocateCommand();
      }
      await sendCommand(userData.sessionToken, command, userData.rsaSigKey);

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
      title: 'Locate: All',
      description: 'Get a location from all location providers',
      onClick: () => void executeCommand(COMMANDS.LOCATE_ALL),
    },
    {
      icon: Navigation,
      title: 'Locate: Fused',
      description: 'Get a location from network/GPS',
      onClick: () => void executeCommand(COMMANDS.LOCATE_FUSED),
    },
    {
      icon: Satellite,
      title: 'Locate: GPS',
      description: 'Get a location from GPS',
      onClick: () => void executeCommand(COMMANDS.LOCATE_GPS),
    },
    {
      icon: RadioTower,
      title: 'Locate: Cell',
      description:
        'Get a location from the surrounding cell towers with OpenCelliD and/or BeaconDB',
      onClick: () => void executeCommand(COMMANDS.LOCATE_CELL),
    },
    {
      icon: History,
      title: 'Locate: Last Known',
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
      icon: Flashlight,
      title: 'Flash',
      description: 'Flash the torch light',
      onClick: () => void executeCommand(COMMANDS.FLASH),
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
      icon: Image,
      title: 'View Photos',
      description: 'View photos taken by the device',
      onClick: onViewPhotos,
    },
    {
      icon: Satellite,
      title: 'Enable Location Services',
      description: 'Turn on Location Services',
      onClick: () => void executeCommand(COMMANDS.GPS_ON),
    },
    {
      icon: Satellite,
      title: 'Disable Location Services',
      description: 'Turn off Location Services',
      onClick: () => void executeCommand(COMMANDS.GPS_OFF),
    },
    {
      icon: Bluetooth,
      title: 'Enable Bluetooth',
      description: 'Turn on Bluetooth',
      onClick: () => void executeCommand(COMMANDS.BLUETOOTH_ON),
    },
    {
      icon: BluetoothOff,
      title: 'Disable Bluetooth',
      description: 'Turn off Bluetooth',
      onClick: () => void executeCommand(COMMANDS.BLUETOOTH_OFF),
    },
    {
      icon: Bell,
      title: 'Ringer: Normal',
      description: 'Set ringer mode to normal',
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_NORMAL),
    },
    {
      icon: Volume2,
      title: 'Ringer: Vibrate',
      description: 'Set ringer mode to vibrate',
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_VIBRATE),
    },
    {
      icon: BellOff,
      title: 'Ringer: Silent',
      description: 'Set ringer mode to silent',
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_SILENT),
    },
    {
      icon: BellOff,
      title: 'Do Not Disturb On',
      description: 'Enable Do Not Disturb mode',
      onClick: () => void executeCommand(COMMANDS.NODISTURB_ON),
    },
    {
      icon: Bell,
      title: 'Do Not Disturb Off',
      description: 'Disable Do Not Disturb mode',
      onClick: () => void executeCommand(COMMANDS.NODISTURB_OFF),
    },
  ];

  const currentLocation = locations[currentLocationIndex];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="dark:border-fmd-dark-border dark:bg-fmd-dark rounded-lg border border-gray-200 bg-white p-4">
        {isLocationsLoading && (
          <div className="flex h-18 items-center justify-center">
            <Spinner />
          </div>
        )}

        {!isLocationsLoading && currentLocation && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-fmd-green/10 rounded-full p-3">
                <Smartphone className="text-fmd-green h-6 w-6" />
              </div>

              <div className="flex-1">
                <BatteryIndicator percentage={currentLocation.bat} />
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  Recorded at
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(currentLocation.date).toLocaleString()}
                </div>
              </div>
            </div>

            {locations.length > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 font-semibold"
                  onClick={() =>
                    useStore.setState({
                      currentLocationIndex: Math.max(
                        0,
                        currentLocationIndex - 1
                      ),
                    })
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
                    useStore.setState({
                      currentLocationIndex: Math.min(
                        locations.length - 1,
                        currentLocationIndex + 1
                      ),
                    })
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

        {!isLocationsLoading && !currentLocation && (
          <div className="flex h-18 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            No location data yet
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-track]:bg-transparent">
        {!isPushUrlLoading && !pushUrl && (
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
        onClose={() => {
          setShowFactoryResetConfirm(false);
          setDeletePin('');
        }}
        onConfirm={() => {
          if (deletePin.trim()) {
            void executeCommand(`delete ${deletePin.trim()}`);
            setDeletePin('');
          } else {
            toast.error('Please enter your device PIN');
          }
        }}
        title="Factory reset the device?"
        message="This will permanently delete all data from your device and restore it to factory settings. This action cannot be undone."
        confirmText="Factory Reset"
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
    </div>
  );
};
