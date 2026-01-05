'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { DevicePanel } from '@/components/DevicePanel';
import { LocationMap } from '@/components/LocationMap';
import { PhotosModal } from '@/components/PhotosModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/ui/spinner';
import { getLocations, decryptLocations } from '@/lib/api';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

const Home = () => {
  const { isLoggedIn, userData, wasAuthChecked, locations } = useStore();
  const [photosOpen, setPhotosOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastLocateTime, setLastLocateTime] = useState<number | null>(null);

  const fetchLocations = async (showLoading = true) => {
    if (!userData) return;

    if (showLoading) useStore.setState({ isLocationsLoading: true });
    try {
      const encryptedLocations = await getLocations(userData.sessionToken);
      const decryptedLocations = await decryptLocations(
        encryptedLocations,
        userData.rsaEncKey
      );

      const isFirstLoad = locations.length === 0;
      const hasNewLocations = decryptedLocations.length > locations.length;

      if (isFirstLoad || hasNewLocations) {
        useStore.setState({
          currentLocationIndex: decryptedLocations.length - 1,
        });
      }

      useStore.setState({ locations: decryptedLocations });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch locations';
      toast.error(message || 'An unknown error occurred');
    } finally {
      if (showLoading) useStore.setState({ isLocationsLoading: false });
    }
  };

  useEffect(() => {
    if (isLoggedIn && userData) {
      void fetchLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !userData) return;

    const getPollingInterval = () => {
      if (!lastLocateTime) return 15 * 60 * 1000; // 15 minutes

      const timeSinceLocate = Date.now() - lastLocateTime;
      const twoMinutes = 2 * 60 * 1000;

      // If within 2 minutes of locate command, poll every 20 seconds
      if (timeSinceLocate < twoMinutes) {
        return 20 * 1000; // 20 seconds
      }

      return 15 * 60 * 1000; // 15 minutes
    };

    const poll = () => {
      void fetchLocations(false);
    };

    const interval = setInterval(poll, getPollingInterval());

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userData, lastLocateTime]);

  if (!wasAuthChecked) {
    return (
      <div className="dark:bg-fmd-dark-lighter flex min-h-screen items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  return (
    <>
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <div className="dark:bg-fmd-dark-lighter flex h-[calc(100vh-3.1rem)] flex-col bg-gray-50 text-gray-900 dark:text-white">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
          {userData && (
            <div className="order-2 w-full lg:order-1 lg:w-80 lg:shrink-0">
              <DevicePanel
                onViewPhotos={() => setPhotosOpen(true)}
                onLocateCommand={() => setLastLocateTime(Date.now())}
              />
            </div>
          )}

          <div className="order-1 min-h-64 flex-1 rounded-lg lg:order-2 lg:min-h-0">
            <LocationMap />
          </div>
        </div>
      </div>

      <PhotosModal isOpen={photosOpen} onClose={() => setPhotosOpen(false)} />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

export default Home;
