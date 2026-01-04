'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivacyContentProps {
  showBackButton?: boolean;
}

export const PrivacyContent = ({
  showBackButton = true,
}: PrivacyContentProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="dark:bg-fmd-dark-lighter min-h-screen bg-white">
      <div className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {showBackButton && (
            <Link
              href="/"
              className="hover:text-fmd-green dark:hover:text-fmd-green mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors dark:text-gray-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Link>
          )}

          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
              FMD Server
            </h1>
            <h2 className="text-fmd-green text-2xl font-semibold">
              Privacy Notice
            </h2>
          </div>

          <nav className="dark:border-fmd-dark-border dark:bg-fmd-dark mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Quick Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#visiting" className="text-fmd-green hover:underline">
                  What data is stored when visiting the website?
                </a>
              </li>
              <li>
                <a href="#stored" className="text-fmd-green hover:underline">
                  What data is stored on the server?
                </a>
              </li>
              <li>
                <a
                  href="#encryption"
                  className="text-fmd-green hover:underline"
                >
                  How exactly does the encryption work?
                </a>
              </li>
              <li>
                <a
                  href="#transferred"
                  className="text-fmd-green hover:underline"
                >
                  Is my data transferred/sold/etc?
                </a>
              </li>
              <li>
                <a href="#access" className="text-fmd-green hover:underline">
                  Who has access to the data?
                </a>
              </li>
              <li>
                <a href="#delete" className="text-fmd-green hover:underline">
                  How can I delete my data from the server?
                </a>
              </li>
              <li>
                <a href="#export" className="text-fmd-green hover:underline">
                  How can I export my data?
                </a>
              </li>
              <li>
                <a
                  href="#change-password"
                  className="text-fmd-green hover:underline"
                >
                  How can I change my password?
                </a>
              </li>
              <li>
                <a
                  href="#reset-password"
                  className="text-fmd-green hover:underline"
                >
                  How can I reset my password?
                </a>
              </li>
            </ul>
          </nav>

          <div className="space-y-8">
            <section id="visiting">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                What data is stored when visiting the website?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                To establish a connection, your IP address is transmitted. To
                prevent abuse, the IP address is logged for failed login
                attempts.
              </p>
            </section>

            <section id="stored">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                What data is stored on the server?
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 font-medium text-gray-900 dark:text-white">
                    In plaintext:
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
                    <li>FMD ID</li>
                    <li>Password Hash</li>
                    <li>Public key</li>
                    <li>Push URL</li>
                    <li>Unix timestamp when the client last connected</li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-900 dark:text-white">
                    Signed:
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Command to be delivered to the phone</li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-gray-900 dark:text-white">
                    Encrypted:
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Private key</li>
                    <li>If uploaded: pictures</li>
                    <li>
                      If uploaded: locations (lat, lon, battery level,
                      timestamp)
                    </li>
                  </ul>
                </div>

                <p className="border-l-4 border-yellow-500 bg-yellow-50 p-4 leading-relaxed text-gray-700 dark:bg-yellow-900/20 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">
                    Important:
                  </strong>{' '}
                  you need to keep your password safe! Your password is used to
                  unlock the encrypted private key.
                </p>
              </div>
            </section>

            <section id="encryption">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                How exactly does the encryption work?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Please see the description on the{' '}
                <a
                  href="https://fmd-foss.org/docs/fmd-server/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fmd-green font-medium hover:underline"
                >
                  project website
                </a>
                .
              </p>
            </section>

            <section id="transferred">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Is my data transferred/sold/etc?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Your data is only used to provide the functionality of finding
                and controlling your device. It is not given to other parties.
              </p>
            </section>

            <section id="access">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                Who has access to the data?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Only the server operator has access to the database. But all
                important data is encrypted anyway.
              </p>
            </section>

            <section id="delete">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                How can I delete my data from the server?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                You can delete your account using the &quot;Delete Account&quot;
                button in the web interface and in the Android app.
              </p>
            </section>

            <section id="export">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                How can I export my data?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Log in via the web interface, click on the settings icon, and
                then click on &quot;Export Data&quot;. This will fetch all data
                from the server, decrypt it locally, and locally create a ZIP
                file that you can save to your computer.
              </p>
            </section>

            <section id="change-password">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                How can I change my password?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                You can change your password in the FMD Android app in the FMD
                Server settings section.
              </p>
            </section>

            <section id="reset-password">
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                How can I reset my password?
              </h3>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                You cannot reset your password, only change it. The server
                administrator cannot reset or change your password. They can
                only delete your account entirely (allowing you to register
                again). However, since this is destructive, the server
                administrator should only do so if they can verify that this
                account really belongs to you.
              </p>
            </section>
          </div>
        </div>

        {showScrollTop && (
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            size="icon"
            className="fixed right-8 bottom-8 rounded-full shadow-lg"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
