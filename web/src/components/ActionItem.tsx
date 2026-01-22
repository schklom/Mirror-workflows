import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface ActionItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}

export const ActionItem = ({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
  variant = 'default',
}: ActionItemProps) => {
  const isDestructive = variant === 'destructive';

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="h-auto w-full justify-start gap-3 rounded-none border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/8"
    >
      <div
        className={cn(
          'rounded-lg p-2',
          isDestructive
            ? 'bg-red-100 dark:bg-red-950'
            : 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            isDestructive
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-300'
          )}
        />
      </div>
      <div className="flex-1 text-left">
        <div
          className={cn(
            'font-medium',
            isDestructive
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          )}
        >
          {title}
        </div>
        <div className="pt-1 text-sm whitespace-normal text-gray-600 dark:text-gray-400">
          {description}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </Button>
  );
};
