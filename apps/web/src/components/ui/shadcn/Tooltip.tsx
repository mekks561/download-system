import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

export interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof TooltipPrimitive.Content>>;
}

const TooltipContent = ({ className, ref, ...props }: TooltipContentProps) => (
  <TooltipPrimitive.Content
    ref={ref}
    className={`z-50 max-w-xs overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-lg data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95 ${className}`}
    {...props}
  />
);

export interface TooltipArrowProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow> {
  ref?: React.Ref<React.ElementRef<typeof TooltipPrimitive.Arrow>>;
}

const TooltipArrow = ({ className, ref, ...props }: TooltipArrowProps) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={`h-2 w-2 shrink-0 overflow-hidden text-gray-200 data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 ${className}`}
    {...props}
  />
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipProvider };
