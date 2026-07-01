import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={`relative flex h-8 w-full touch-none items-center ${className}`}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
      <SliderPrimitive.Range className="absolute h-full bg-primary-600" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="focus:outline-none relative h-5 w-5 shrink-0 cursor-pointer rounded-full border-2 border-primary-600 bg-white shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-primary-500" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };