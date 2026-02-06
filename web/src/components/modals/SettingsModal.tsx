import { useState } from 'react';
import { ExternalLink, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import {
  deleteAccount,
  getLocations,
  getPictures,
  getPushUrl,
} from '@/lib/api';
import { useStore, logout, type UnitSystem } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { LoadingModal } from '@/components/modals/LoadingModal';
import { LanguageNativeSelect } from '../LanguageNativeSelect';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { userData, units } = useStore();
  const { t } = useTranslation(['settings', 'login']);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportLoading, setShowExportLoading] = useState(false);

  const handleExport = async () => {
    if (!userData) {
      toast.error('Not logged in');
      return;
    }

    setShowExportLoading(true);

    try {
      const [locations, pictures, pushUrl] = await Promise.all([
        getLocations(userData.sessionToken, userData.rsaEncKey),
        getPictures(userData.sessionToken, userData.rsaEncKey),
        getPushUrl(userData.sessionToken),
      ]);

      let locationsCSV =
        'Date,Provider,Battery,Latitude,Longitude,Accuracy,Altitude,Speed,Bearing\n';

      for (const loc of locations) {
        const date = new Date(loc.time).toISOString();
        const accuracy = loc.accuracy || '';
        const altitude = loc.altitude || '';
        const speed = loc.speed || '';
        const bearing = loc.bearing || '';
        locationsCSV += `${date},${loc.provider},${loc.bat},${loc.lat},${loc.lon},${accuracy},${altitude},${speed},${bearing}\n`;
      }

      const generalInfo = {
        fmdId: userData.fmdId,
        pushUrl: pushUrl,
      };

      const JSZip = (await import('jszip')).default; // lazy-load
      const zip = new JSZip();
      zip.file('info.json', JSON.stringify(generalInfo));
      zip.file('locations.csv', locationsCSV);

      const picturesFolder = zip.folder('pictures');
      if (picturesFolder) {
        for (let i = 0; i < pictures.length; i++) {
          picturesFolder.file(`${i}.png`, pictures[i], { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fmd-export-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }

    setShowExportLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="settings" className="flex-1">
              {t('general')}
            </TabsTrigger>

            <TabsTrigger value="about" className="flex-1">
              {t('about')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">
                {t('theme')}
              </h3>
              <ThemeToggle />
            </div>

            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">
                {t('units')}
              </h3>
              <ToggleGroup
                type="single"
                value={units}
                onValueChange={(value) =>
                  value && useStore.setState({ units: value as UnitSystem })
                }
              >
                <ToggleGroupItem value="metric">
                  {t('units_metric')}
                </ToggleGroupItem>
                <ToggleGroupItem value="imperial">
                  {t('units_imperial')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">
                {t('language.title')}
              </h3>
              <LanguageNativeSelect />
            </div>

            <div>
              <h3 className="text-fmd-green mb-3 font-semibold">
                {t('account')}
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => void handleExport()}>
                  {t('export_data')}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t('delete_account')}
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
                {t('about_text')}
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
                    {t('login:source_code')}
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
                    {t('login:project_website')}
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-fmd-green dark:hover:text-fmd-green flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <Shield className="h-4 w-4" />
                    {t('login:privacy_notice')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-fmd-green font-semibold">FMD Android</h3>
              <a
                href="https://f-droid.org/packages/de.nulide.findmydevice/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block"
              >
                <img
                  src="/fdroid-badge.png"
                  alt="Get it on F-Droid"
                  className="h-16 w-auto"
                />
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <LoadingModal
        isOpen={showExportLoading}
        message={t('export_data_loading_message')}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          void (async () => {
            if (!userData) return;

            try {
              await deleteAccount(userData.sessionToken);
              await logout();
              setShowDeleteConfirm(false);
              onClose();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Delete failed'
              );
            }
          })();
        }}
        title={t('delete_account_title')}
        message={t('delete_account_description')}
        confirmText={t('delete_account')}
      />
    </Dialog>
  );
};
