import {
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatteryIndicatorProps {
  percentage: number;
  className?: string;
}

export const BatteryIndicator = ({
  percentage,
  className,
}: BatteryIndicatorProps) => {
  const getBatteryDisplay = () => {
    if (percentage >= 75)
      return {
        Icon: BatteryFull,
        color: 'text-green-600 dark:text-green-400',
      };
    if (percentage >= 50)
      return {
        Icon: BatteryMedium,
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    if (percentage >= 25)
      return {
        Icon: BatteryLow,
        color: 'text-orange-600 dark:text-orange-400',
      };
    return { Icon: BatteryWarning, color: 'text-red-600 dark:text-red-400' };
  };

  const { Icon, color } = getBatteryDisplay();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon className={cn('h-4 w-4', color)} />
      <span className="text-lg font-semibold text-gray-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  );
};
