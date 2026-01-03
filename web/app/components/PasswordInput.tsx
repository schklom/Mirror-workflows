import { forwardRef, useState, ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={isVisible ? 'text' : 'password'}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pr-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
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

// eslint-disable-next-line sonarjs/no-hardcoded-passwords
PasswordInput.displayName = 'PasswordInput';
