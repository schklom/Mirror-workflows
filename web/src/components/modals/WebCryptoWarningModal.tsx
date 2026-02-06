import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from './ConfirmModal';

export const WebCryptoWarningModal = () => {
  const { t } = useTranslation(['modals', 'common']);
  const [show, setShow] = useState(window.crypto.subtle === undefined);

  return (
    <ConfirmModal
      isOpen={show}
      onConfirm={() => setShow(false)}
      title={t('webcrypto_warning.title')}
      confirmText={t('common:okay')}
    >
      <p>{t('webcrypto_warning.message')}</p>
      <p className="mt-4">
        {t('webcrypto_warning.detail')}{' '}
        <a
          href="https://fmd-foss.org/docs/fmd-server/installation/overview"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('webcrypto_warning.link_text')}
        </a>
        .
      </p>
    </ConfirmModal>
  );
};
