import { forwardRef, useState, ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        variant="ghost"
        size="sm"
        className="absolute top-0 right-0 h-9 w-10 px-0"
        aria-label={isVisible ? 'Hide input' : 'Show input'}
      >
        {isVisible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
