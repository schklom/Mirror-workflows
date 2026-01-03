import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/storage';
import { getKeys, clearKeys } from '@/lib/keystore';

interface UserData {
  fmdId: string;
  sessionToken: string;
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = getSession();

        if (session?.persistent) {
          const keys = await getKeys();

          if (keys) {
            setUserData({
              fmdId: session.fmdId,
              sessionToken: session.sessionToken,
              rsaEncKey: keys.rsaEncKey,
              rsaSigKey: keys.rsaSigKey,
            });
            setIsLoggedIn(true);
          } else {
            clearSession();
          }
        } else if (session) {
          clearSession();
        }
      } catch {
        clearSession();
        await clearKeys();
      } finally {
        setCheckingSession(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const handleSessionUpdate = () => {
      const session = getSession();
      if (!session) {
        setIsLoggedIn(false);
        setUserData(null);
      }
    };

    window.addEventListener('session-updated', handleSessionUpdate);
    return () =>
      window.removeEventListener('session-updated', handleSessionUpdate);
  }, []);

  const login = (data: UserData) => {
    setUserData(data);
    setIsLoggedIn(true);
  };

  return {
    isLoggedIn,
    userData,
    checkingSession,
    login,
  };
};
