import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof SeparatorPrimitive.Root>>;
}

const Separator = ({ className, orientation = 'horizontal', decorative = true, ref, ...props }: SeparatorProps) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={`shrink-0 bg-gray-200 ${orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'} ${className}`}
    {...props}
  />
);

export { Separator };
