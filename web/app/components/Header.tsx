'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession, clearSession } from '@/lib/storage';
import { clearKeys } from '@/lib/keystore';

interface HeaderProps {
  onSettingsClick?: () => void;
  showSettings?: boolean;
}

export const Header = ({
  onSettingsClick,
  showSettings = true,
}: HeaderProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [fmdId, setFmdId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSessionUpdate = () => {
      const session = getSession();
      setFmdId(session?.fmdId ?? null);
    };

    handleSessionUpdate();

    window.addEventListener('session-updated', handleSessionUpdate);
    window.addEventListener('storage', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-updated', handleSessionUpdate);
      window.removeEventListener('storage', handleSessionUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      // Delay adding the listener to avoid catching the click that opened the menu
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleLogout = async () => {
    clearSession();
    await clearKeys();
    window.dispatchEvent(new Event('session-updated'));
  };

  return (
    <header className="dark:bg-fmd-dark flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/FMD.svg"
          alt="FMD"
          width={24}
          height={24}
          className="text-fmd-green"
        />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          FMD Server
        </h1>
      </Link>
      {fmdId && (
        <div className="flex items-center gap-2">
          {showSettings && onSettingsClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSettingsClick}
              title="Settings"
              className="rounded-lg"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen(!userMenuOpen);
              }}
              className="gap-2"
            >
              <div className="text-right">
                <div className="text-xs font-semibold">{fmdId}</div>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            {userMenuOpen && (
              <div className="dark:bg-fmd-dark absolute top-full right-0 z-9999 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full justify-center"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
