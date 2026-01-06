import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', sizeMap[size], className)}
      aria-label="Loading"
    />
  );
}

export { Spinner };
