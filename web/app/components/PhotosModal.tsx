'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getPictures } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface PhotosModalProps {
  isOpen: boolean;
  sessionToken?: string;
  onClose: () => void;
}

export const PhotosModal = ({
  isOpen,
  sessionToken,
  onClose,
}: PhotosModalProps) => {
  const [pictures, setPictures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen && sessionToken) {
      void (async () => {
        setLoading(true);
        try {
          const pics = await getPictures(sessionToken);
          setPictures(pics);
          setSelectedIndex(pics.length - 1);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to load photos'
          );
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen, sessionToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-200">
        <DialogTitle className="sr-only">Device Photos</DialogTitle>
        <div className="max-h-[80vh] overflow-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Spinner size="lg" />
            </div>
          )}
          {!loading && pictures.length === 0 && (
            <div className="p-8 text-center text-white">
              No photos available
            </div>
          )}
          {!loading && pictures.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-semibold"
                  onClick={() =>
                    setSelectedIndex(Math.max(0, selectedIndex - 1))
                  }
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Older
                </Button>
                <span className="text-sm text-white">
                  {selectedIndex + 1} of {pictures.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-semibold"
                  onClick={() =>
                    setSelectedIndex(
                      Math.min(pictures.length - 1, selectedIndex + 1)
                    )
                  }
                  disabled={selectedIndex === pictures.length - 1}
                >
                  Newer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Image
                src={`data:image/jpeg;base64,${pictures[selectedIndex]}`}
                alt={`Device capture ${selectedIndex + 1}`}
                className="max-h-full max-w-full"
                width={800}
                height={600}
                unoptimized
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
