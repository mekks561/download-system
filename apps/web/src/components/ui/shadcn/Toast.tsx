import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

const toastVariants = cva(
  'group pointer-events-auto flex items-center justify-between gap-2 rounded-md border p-4 shadow-lg transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-gray-200 bg-white text-gray-900',
        destructive: 'border-red-200 bg-red-50 text-red-900',
        success: 'border-green-200 bg-green-50 text-green-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const ToastProvider = ToastPrimitive.Provider;

export interface ToastViewportProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> {
  ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Viewport>>;
}

const ToastViewport = ({ className, ref, ...props }: ToastViewportProps) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={`fixed bottom-0 right-0 z-50 flex max-h-[400px] w-full flex-col gap-2 p-4 sm:max-w-[420px] ${className}`}
    {...props}
  />
);

export type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants> & {
    ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Root>>;
  };

const Toast = ({ className, variant, ref, ...props }: ToastProps) => (
  <ToastPrimitive.Root
    ref={ref}
    className={`${toastVariants({ variant })} ${className}`}
    {...props}
  />
);

export interface ToastActionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> {
  ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Action>>;
}

const ToastAction = ({ className: _className, ref, ...props }: ToastActionProps) => (
  <ToastPrimitive.Action
    ref={ref}
    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-gray-100 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
    {...props}
  />
);

export interface ToastCloseProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close> {
  ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Close>>;
}

const ToastClose = ({ className: _className, ref, ...props }: ToastCloseProps) => (
  <ToastPrimitive.Close
    ref={ref}
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
);

export interface ToastTitleProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title> {
  ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Title>>;
}

const ToastTitle = ({ className, ref, ...props }: ToastTitleProps) => (
  <ToastPrimitive.Title
    ref={ref}
    className={`font-semibold ${className}`}
    {...props}
  />
);

export interface ToastDescriptionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description> {
  ref?: React.Ref<React.ElementRef<typeof ToastPrimitive.Description>>;
}

const ToastDescription = ({ className, ref, ...props }: ToastDescriptionProps) => (
  <ToastPrimitive.Description
    ref={ref}
    className={`text-sm opacity-90 ${className}`}
    {...props}
  />
);

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
};
