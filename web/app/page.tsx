'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { DevicePanel } from '@/components/DevicePanel';
import { LocationMap } from '@/components/LocationMap';
import { PhotosModal } from '@/components/PhotosModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/ui/spinner';
import { getLocations } from '@/lib/api';
import { decryptData } from '@/lib/crypto';
import { useStore } from '@/lib/store';
import type { Location } from '@/lib/api';
import { toast } from 'sonner';

const Home = () => {
  const {
    isLoggedIn,
    userData,
    isCheckingSession,
    locations,
    setLocations,
    setLocationsLoading,
    setCurrentLocationIndex,
  } = useStore();
  const [photosOpen, setPhotosOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastLocateTime, setLastLocateTime] = useState<number | null>(null);

  const fetchLocations = async (showLoading = true) => {
    if (!userData) return;

    if (showLoading) setLocationsLoading(true);
    try {
      const encryptedLocations = await getLocations(userData.sessionToken);

      const decryptedLocations = await Promise.all(
        encryptedLocations.map(async (encryptedLoc) => {
          const decrypted = await decryptData(
            userData.rsaEncKey,
            encryptedLoc.Position
          );
          return JSON.parse(decrypted) as Location;
        })
      );

      const isFirstLoad = locations.length === 0;
      const hasNewLocations = decryptedLocations.length > locations.length;

      if (isFirstLoad || hasNewLocations) {
        setCurrentLocationIndex(decryptedLocations.length - 1);
      }

      setLocations(decryptedLocations);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch locations';
      toast.error(message || 'An unknown error occurred');
    } finally {
      if (showLoading) setLocationsLoading(false);
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

  if (isCheckingSession) {
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
