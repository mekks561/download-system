import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof CheckboxPrimitive.Root>>;
}

const Checkbox = ({ className, ref, ...props }: CheckboxProps) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={`peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 bg-white transition-colors data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${className}`}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex h-full w-full items-center justify-center">
      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

export { Checkbox };
