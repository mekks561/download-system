import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof LabelPrimitive.Root>>;
}

const Label = ({ className, ref, ...props }: LabelProps) => (
  <LabelPrimitive.Root
    ref={ref}
    className={`text-sm font-medium text-gray-700 ${className}`}
    {...props}
  />
);

export { Label };
