import { Settings, ChevronDown, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/lib/store';

interface HeaderProps {
  onSettingsClick?: () => void;
}

export const Header = ({ onSettingsClick }: HeaderProps) => {
  const { userData, logout } = useStore();
  const { t } = useTranslation('common');

  return (
    <header className="dark:bg-fmd-dark flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800">
      <a href="/" className="ms-2 flex items-center gap-2">
        <img
          src="/icon.svg"
          alt="FMD"
          width="24"
          height="24"
          className="text-fmd-green"
        />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          FMD Server
        </h1>
      </a>
      {userData && (
        <div className="flex items-center gap-2">
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSettingsClick}
              title={t('settings')}
              className="rounded-lg"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="text-right">
                  <div className="text font-semibold">{userData.fmdId}</div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-1000 w-40 bg-white dark:bg-gray-800"
            >
              <DropdownMenuItem onClick={() => void logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
};
