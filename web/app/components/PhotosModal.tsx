'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getPictures } from '@/lib/api';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface PhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhotosModal = ({ isOpen, onClose }: PhotosModalProps) => {
  const { userData, pictures, isPicturesLoading } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen && userData) {
      void (async () => {
        useStore.setState({ isPicturesLoading: true });
        try {
          const pics = await getPictures(
            userData.sessionToken,
            userData.rsaEncKey
          );
          useStore.setState({ pictures: pics });
          setSelectedIndex(pics.length - 1);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to load photos'
          );
        } finally {
          useStore.setState({ isPicturesLoading: false });
        }
      })();
    }
  }, [isOpen, userData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogTitle className="sr-only">Device Photos</DialogTitle>
        <div className="max-h-[90vh] overflow-auto">
          {isPicturesLoading && (
            <div className="flex items-center justify-center p-8">
              <Spinner size="lg" />
            </div>
          )}
          {!isPicturesLoading && pictures.length === 0 && (
            <div className="p-8 text-center text-gray-900 dark:text-white">
              No photos available
            </div>
          )}
          {!isPicturesLoading && pictures.length > 0 && (
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
                <span className="text-sm text-gray-900 dark:text-white">
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
              <div className="relative h-[70vh] w-full">
                <Image
                  src={`data:image/jpeg;base64,${pictures[selectedIndex]}`}
                  alt={`Device capture ${selectedIndex + 1}`}
                  fill
                  unoptimized
                  className="rounded object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
