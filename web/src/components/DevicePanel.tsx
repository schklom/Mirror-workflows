import { sendCommand, getPushUrl } from '../lib/api';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Vibrate,
} from 'lucide-react';
import { ActionItem } from '@/components/ActionItem';
import { BatteryIndicator } from '@/components/BatteryIndicator';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FactoryResetModal } from './modals/FactoryResetModal';
import { LockMessageModal } from './modals/LockMessageModal';

// Across this file and the UI, commands are ordered by perceived importance.
// If you change the order in one place, make sure to keep it aligned everywhere!

export const COMMANDS = {
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

interface DevicePanelProps {
  onViewPhotos: () => void;
  onLocateCommand?: () => void;
}

interface ActionData {
  icon: any;
  title: string;
  description: string | null;
  onClick: () => void;
  variant?: 'default' | 'destructive'; // same as ActionItemProps
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

  const { t: tCommands } = useTranslation('commands');
  const { t: tDashboard } = useTranslation('dashboard');
  const [loading, setLoading] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [showLockMessageConfirm, setShowLockMessageConfirm] = useState(false);

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

  const executeCommand = async (
    command: string,
    baseCommand: string | null = null
  ) => {
    if (!userData) return;

    setLoading(true);
    try {
      if (command.startsWith('locate') && onLocateCommand) {
        onLocateCommand();
      }
      await sendCommand(userData.sessionToken, command, userData.rsaSigKey);

      // baseCommand is for handling commands such as "locate custom message"
      if (!baseCommand) {
        baseCommand = command;
      }
      const msg = tCommands(`success.${baseCommand?.replace(' ', '_')}`);
      toast.success(msg);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tDashboard('command_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const groupLocations = [
    {
      icon: Navigation,
      title: tCommands('locate_all.title'),
      description: tCommands('locate_all.description'),
      onClick: () => void executeCommand(COMMANDS.LOCATE_ALL),
    },
    {
      icon: Navigation,
      title: tCommands('locate_fused.title'),
      description: tCommands('locate_fused.description'),
      onClick: () => void executeCommand(COMMANDS.LOCATE_FUSED),
    },
    {
      icon: Satellite,
      title: tCommands('locate_gps.title'),
      description: tCommands('locate_gps.description'),
      onClick: () => void executeCommand(COMMANDS.LOCATE_GPS),
    },
    {
      icon: RadioTower,
      title: tCommands('locate_cell.title'),
      description: tCommands('locate_cell.description'),
      onClick: () => void executeCommand(COMMANDS.LOCATE_CELL),
    },
    {
      icon: History,
      title: tCommands('locate_last.title'),
      description: tCommands('locate_last.description'),
      onClick: () => void executeCommand(COMMANDS.LOCATE_LAST),
    },
  ];
  const groupGeneral = [
    {
      icon: Volume2,
      title: tCommands('ring.title'),
      description: tCommands('ring.description'),
      onClick: () => void executeCommand(COMMANDS.RING),
    },
    {
      icon: Flashlight,
      title: tCommands('flash.title'),
      description: tCommands('flash.description'),
      onClick: () => void executeCommand(COMMANDS.FLASH),
    },
    {
      icon: Lock,
      title: tCommands('lock.title'),
      description: tCommands('lock.description'),
      onClick: () => setShowLockMessageConfirm(true),
    },
    {
      icon: Trash2,
      title: tCommands('factory_reset.title'),
      description: tCommands('factory_reset.description'),
      onClick: () => setShowFactoryResetConfirm(true),
      variant: 'destructive' as const,
    },
  ];
  const groupPictures = [
    {
      icon: UserCircle,
      title: tCommands('camera_front.title'),
      description: tCommands('camera_front.description'),
      onClick: () => void executeCommand(COMMANDS.CAMERA_FRONT),
    },
    {
      icon: Camera,
      title: tCommands('camera_back.title'),
      description: tCommands('camera_back.description'),
      onClick: () => void executeCommand(COMMANDS.CAMERA_BACK),
    },
    {
      icon: Image,
      title: tCommands('view_photos.title'),
      description: tCommands('view_photos.description'),
      onClick: onViewPhotos,
    },
  ];
  const groupLocationServices = [
    {
      icon: Satellite,
      title: tCommands('gps_on.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.GPS_ON),
    },
    {
      icon: Satellite,
      title: tCommands('gps_off.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.GPS_OFF),
    },
  ];
  const groupBluetooth = [
    {
      icon: Bluetooth,
      title: tCommands('bluetooth_on.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.BLUETOOTH_ON),
    },
    {
      icon: BluetoothOff,
      title: tCommands('bluetooth_off.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.BLUETOOTH_OFF),
    },
  ];
  const groupRinger = [
    {
      icon: Bell,
      title: tCommands('ringer_normal.title'),
      description: tCommands('ringer_normal.description'),
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_NORMAL),
    },
    {
      icon: Vibrate,
      title: tCommands('ringer_vibrate.title'),
      description: tCommands('ringer_vibrate.description'),
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_VIBRATE),
    },
    {
      icon: BellOff,
      title: tCommands('ringer_silent.title'),
      description: tCommands('ringer_silent.description'),
      onClick: () => void executeCommand(COMMANDS.RINGERMODE_SILENT),
    },
  ];
  const groupDnd = [
    {
      icon: BellOff,
      title: tCommands('dnd_on.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.NODISTURB_ON),
    },
    {
      icon: Bell,
      title: tCommands('dnd_off.title'),
      description: null,
      onClick: () => void executeCommand(COMMANDS.NODISTURB_OFF),
    },
  ];
  const actionGroups: Array<Array<ActionData>> = [
    groupLocations,
    groupGeneral,
    groupPictures,
    groupLocationServices,
    groupBluetooth,
    groupRinger,
    groupDnd,
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
                  {tDashboard('location.recorded_at')}
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
                  {tDashboard('location.older')}
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
                  {tDashboard('location.newer')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {!isLocationsLoading && !currentLocation && (
          <div className="flex h-18 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            {tDashboard('location.no_data')}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-track]:bg-transparent">
        {!isPushUrlLoading && !pushUrl && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {tDashboard('location.no_push_url')}
            </p>
          </div>
        )}

        {actionGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="dark:border-fmd-dark-border dark:bg-fmd-dark rounded-lg border border-gray-200 bg-white"
          >
            {group.map((action, index) => (
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
        ))}
      </div>

      <LockMessageModal
        isOpen={showLockMessageConfirm}
        onClose={() => setShowLockMessageConfirm(false)}
        executeCommand={(cmd, base) => void executeCommand(cmd, base)}
      />

      <FactoryResetModal
        isOpen={showFactoryResetConfirm}
        onClose={() => setShowFactoryResetConfirm(false)}
        executeCommand={(cmd, base) => void executeCommand(cmd, base)}
      />
    </div>
  );
};
