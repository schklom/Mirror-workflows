import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getSalt, login, getWrappedPrivateKey, getVersion } from '@/lib/api';
import { hashPasswordForLogin, unwrapPrivateKey } from '@/lib/crypto';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { Checkbox } from '@/components/Checkbox';

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export const LoginForm = () => {
  const { setUserData } = useStore();

  const [fmdId, setFmdId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const ver = await getVersion();
        setVersion(ver);
      } catch {
        // Failed to fetch version, ignore
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const salt = await getSalt(fmdId);

      if (!salt) {
        toast.error('Account not found. Please register on FMD Android first.');
        setLoading(false);
        return;
      }

      const passwordHash = hashPasswordForLogin(password, salt);
      const sessionDurationSeconds = rememberMe ? ONE_WEEK_SECONDS : 0;
      const sessionToken = await login(
        fmdId,
        passwordHash,
        sessionDurationSeconds
      );
      const wrappedPrivateKey = await getWrappedPrivateKey(sessionToken);

      const { rsaEncKey, rsaSigKey } = await unwrapPrivateKey(
        password,
        wrappedPrivateKey
      );

      await setUserData(
        {
          fmdId,
          rsaEncKey,
          rsaSigKey,
          sessionToken,
        },
        rememberMe
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4">
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="dark:border-fmd-dark-border dark:bg-fmd-dark w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-fmd-green mb-6 text-center text-2xl font-bold">
            FMD Server
          </h1>

          <p className="mb-2 text-center text-sm text-gray-700 dark:text-gray-300">
            This platform is for locating and controlling your devices.
          </p>
          <p className="mb-8 text-center text-sm text-gray-700 dark:text-gray-300">
            To get started,{' '}
            <a
              href="https://f-droid.org/packages/de.nulide.findmydevice/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
            >
              install the FMD Android app
            </a>{' '}
            on your mobile device. Then use the app to register an account on
            FMD Server.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <Input
              type="text"
              value={fmdId}
              onChange={(e) => setFmdId(e.target.value)}
              placeholder="FMD ID"
              required
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />

            <Checkbox
              id="rememberMe"
              label="Remember me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full text-lg"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
        </div>
      </div>

      <footer className="pb-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a
            href="https://fmd-foss.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
          >
            Project Website
          </a>
          <span>·</span>
          <a
            href="https://gitlab.com/fmd-foss/fmd-server/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
          >
            Source Code
          </a>
          <span>·</span>
          <a
            href="/privacy"
            className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
          >
            Privacy Notice
          </a>
        </div>

        <div className="mt-2 h-4">
          {version && (
            <a
              href="https://gitlab.com/fmd-foss/fmd-server/-/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fmd-green font-mono text-xs text-gray-600 transition-colors duration-200 dark:text-gray-400"
            >
              v{version}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
};
