import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={`grid gap-2 ${className}`}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={`peer relative flex h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-gray-200 transition-colors data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 [&]:before:[content=""] [&]:before:absolute [&]:before:left-1/2 [&]:before:top-1/2 [&]:before:h-2.5 [&]:before:w-2.5 [&]:before:-translate-x-1/2 [&]:before:-translate-y-1/2 [&]:before:rounded-full [&]:before:bg-white [&]:before:shadow-sm [&]:before:opacity-0 [&]:before:transition-opacity data-[state=checked]:before:opacity-100 ${className}`}
    {...props}
  />
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };