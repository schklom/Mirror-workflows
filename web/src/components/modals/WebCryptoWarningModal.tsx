import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

export const WebCryptoWarningModal = () => {
  const [show, setShow] = useState(window.crypto.subtle === undefined);

  return (
    <ConfirmModal
      isOpen={show}
      onConfirm={() => setShow(false)}
      title="WebCrypto API not available"
      confirmText="Okay"
    >
      <p>
        FMD Server won&apos;t work because the WebCrypto API is not available.
      </p>
      <p className="mt-4">
        This is most likely because you are visiting this site over insecure
        HTTP. Please use HTTPS. If you are self-hosting, see the{' '}
        <a
          href="https://fmd-foss.org/docs/fmd-server/installation/overview"
          target="_blank"
          rel="noopener noreferrer"
        >
          installation guide
        </a>
        .
      </p>
    </ConfirmModal>
  );
};
