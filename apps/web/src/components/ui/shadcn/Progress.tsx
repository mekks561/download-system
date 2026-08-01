import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof ProgressPrimitive.Root>>;
}

const Progress = ({ className, value, ref, ...props }: ProgressProps) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary-600 transition-all duration-300"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
);

export { Progress };
