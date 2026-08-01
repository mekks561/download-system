import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof SwitchPrimitive.Root>>;
}

const Switch = ({ className, ref, ...props }: SwitchProps) => (
  <SwitchPrimitive.Root
    className={`peer inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-500 ${className}`}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-5" />
  </SwitchPrimitive.Root>
);

export { Switch };
