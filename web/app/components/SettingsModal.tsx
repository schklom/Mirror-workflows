'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { deleteAccount, getLocations } from '@/lib/api';
import { decryptData } from '@/lib/crypto';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  getUnitPreference,
  setUnitPreference,
  type UnitSystem,
  clearSession,
} from '@/lib/storage';
import { clearKeys } from '@/lib/keystore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken?: string;
  rsaEncKey?: CryptoKey;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  sessionToken,
  rsaEncKey,
}: SettingsModalProps) => {
  const [units, setUnits] = useState<UnitSystem>(() => getUnitPreference());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleStorage = () => setUnits(getUnitPreference());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleUnitChange = (system: UnitSystem) => {
    setUnits(system);
    setUnitPreference(system);
    window.dispatchEvent(new Event('storage'));
  };

  const handleExport = async () => {
    if (!sessionToken || !rsaEncKey) {
      toast.error('Not logged in');
      return;
    }

    try {
      const encryptedLocations = await getLocations(sessionToken);
      const decryptedLocations = await Promise.all(
        encryptedLocations.map(async (encryptedLoc) => {
          const decrypted = await decryptData(rsaEncKey, encryptedLoc.Position);
          return JSON.parse(decrypted) as unknown;
        })
      );

      const dataStr = JSON.stringify(decryptedLocations, null, 2);

      const stream = new Blob([dataStr])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(stream).blob();

      const url = URL.createObjectURL(compressedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fmd-locations-${new Date().toISOString().split('T')[0]}.json.gz`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="settings" className="flex-1">
              General
            </TabsTrigger>
            <TabsTrigger value="about" className="flex-1">
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">Theme</h3>
              <ThemeToggle />
            </div>
            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">Units</h3>
              <ToggleGroup
                type="single"
                value={units}
                onValueChange={(value) =>
                  value && handleUnitChange(value as UnitSystem)
                }
              >
                <ToggleGroupItem value="metric">Metric</ToggleGroupItem>
                <ToggleGroupItem value="imperial">Imperial</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">Data</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => void handleExport()}>
                  Export Data
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="about"
            className="max-h-96 space-y-4 overflow-y-auto text-gray-900 dark:text-white"
          >
            <div>
              <h3 className="text-fmd-green font-semibold">FMD Server</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find My Device Server - A server to communicate with the FMD
                Android app, to locate and control your devices.
              </p>
            </div>

            <div>
              <h3 className="text-fmd-green font-semibold">Links</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <a
                    href="https://gitlab.com/fmd-foss/fmd-server"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-fmd-green dark:hover:text-fmd-green flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    GitLab Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://fmd-foss.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-fmd-green dark:hover:text-fmd-green flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Project Website
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-fmd-green dark:hover:text-fmd-green flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <Shield className="h-4 w-4" />
                    Privacy Notice
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-fmd-green font-semibold">Get the App</h3>
              <a
                href="https://f-droid.org/packages/de.nulide.findmydevice/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block"
              >
                <Image
                  src="/fdroid-badge.png"
                  alt="Get it on F-Droid"
                  className="h-16 w-auto"
                  width={323}
                  height={125}
                />
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          void (async () => {
            if (!sessionToken) return;

            try {
              await deleteAccount(sessionToken);
              clearSession();
              await clearKeys();
              window.dispatchEvent(new Event('session-updated'));
              setShowDeleteConfirm(false);
              onClose();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Delete failed'
              );
            }
          })();
        }}
        title="Delete Account?"
        message="This will permanently delete your account and all associated data from the server. This action cannot be undone."
        confirmText="Delete Account"
      />
    </Dialog>
  );
};
