import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { getSalt, login, getWrappedPrivateKey, getVersion } from '@/lib/apiv1';
import { hashPasswordForLogin, unwrapPrivateKey } from '@/lib/crypto';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { Checkbox } from '@/components/Checkbox';
import { WebCryptoWarningModal } from './modals/WebCryptoWarningModal';
import { LanguageNativeSelect } from './LanguageNativeSelect';

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

const SLOW_LOGIN_THRESHOLD_MS = 10_000;
const SLOW_LOGIN_TOAST_DURATION_MS = 30_000;

export const LoginForm = () => {
  const { setUserData } = useStore();
  const { t } = useTranslation(['login', 'errors']);

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

  // Hash the password on a Web Worker background thread
  const hashPasswordInWorker = (
    password: string,
    salt: string
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/passwordHashing.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (ev) => {
        resolve(ev.data as string);
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(new Error(err.message));
        worker.terminate();
      };

      worker.postMessage([password, salt]);
    });

  // Send the login request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const salt = await getSalt(fmdId);

      if (!salt) {
        toast.error(t('errors:account_not_found'));
        setLoading(false);
        return;
      }

      // When JavaScript JIT is disabled (Jitless mode), password hashing is very slow (>= 2 mins)
      // https://gitlab.com/fmd-foss/fmd-server/-/issues/142
      const timeOut = setTimeout(() => {
        const msg = t(`login_slow`);
        toast.warning(msg, { duration: SLOW_LOGIN_TOAST_DURATION_MS });
      }, SLOW_LOGIN_THRESHOLD_MS);

      let passwordHash;
      if (window.Worker) {
        // We need to launch the hashing in a background thread.
        // Otherwise, the timeout won't run, since the UI thread is blocked by the hashing.
        passwordHash = await hashPasswordInWorker(password, salt);
      } else {
        // Browser does not support Web Workers
        toast.warning(
          'Web Workers are not supported by this browser. Hashing password on main thread.'
        );
        passwordHash = hashPasswordForLogin(password, salt);
      }

      clearTimeout(timeOut);

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
      toast.error(
        error instanceof Error ? error.message : t('errors:login_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4">
      <div className="flex justify-end pt-8">
        <LanguageNativeSelect />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="dark:border-fmd-dark-border dark:bg-fmd-dark w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-fmd-green mb-6 text-center text-2xl font-bold">
            FMD Server
          </h1>

          <p className="mb-2 text-center text-sm text-gray-700 dark:text-gray-300">
            {t('subtitle')}
          </p>
          <p className="mb-8 text-center text-sm text-gray-700 dark:text-gray-300">
            {t('setup_instruction_1')}{' '}
            <a
              href="https://f-droid.org/packages/de.nulide.findmydevice/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
            >
              {t('setup_instruction_2')}
            </a>{' '}
            {t('setup_instruction_3')}
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <Input
              type="text"
              value={fmdId}
              onChange={(e) => setFmdId(e.target.value)}
              placeholder={t('username_placeholder')}
              required
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password_placeholder')}
              required
            />

            <Checkbox
              id="rememberMe"
              label={t('remember_me')}
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full text-lg"
            >
              {loading ? t('logging_in') : t('log_in')}
            </Button>
          </form>

          <WebCryptoWarningModal />
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
            {t('project_website')}
          </a>
          <span>·</span>
          <a
            href="https://gitlab.com/fmd-foss/fmd-server/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
          >
            {t('source_code')}
          </a>
          <span>·</span>
          <Link
            to="/privacy"
            className="hover:text-fmd-green text-gray-600 transition-colors duration-200 dark:text-gray-400"
          >
            {t('privacy_notice')}
          </Link>
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
