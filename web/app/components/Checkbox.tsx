import { Checkbox as CheckboxPrimitive } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive
> {
  label: React.ReactNode;
  containerClassName?: string;
}

export const Checkbox = ({
  label,
  containerClassName,
  id,
  ...props
}: CheckboxProps) => (
  <div className={cn('flex items-center space-x-2', containerClassName)}>
    <CheckboxPrimitive id={id} className="cursor-pointer" {...props} />
    <Label htmlFor={id} className="cursor-pointer">
      {label}
    </Label>
  </div>
);
