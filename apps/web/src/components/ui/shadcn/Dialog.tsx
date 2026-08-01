import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

export interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Overlay>>;
}

const DialogOverlay = ({ className, ref, ...props }: DialogOverlayProps) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
  />
);

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Content>>;
}

const DialogContent = ({ className, children, ref, ...props }: DialogContentProps) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border border-gray-200 bg-white p-6 shadow-xl transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:max-w-md ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
);

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const DialogHeader = ({ className, ref, ...props }: DialogHeaderProps) => (
  <div ref={ref} className={`flex flex-col space-y-2 text-center sm:text-left ${className}`} {...props} />
);

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const DialogFooter = ({ className, ref, ...props }: DialogFooterProps) => (
  <div ref={ref} className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props} />
);

export interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Title>>;
}

const DialogTitle = ({ className, ref, ...props }: DialogTitleProps) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold text-gray-900 ${className}`}
    {...props}
  />
);

export interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Description>>;
}

const DialogDescription = ({ className, ref, ...props }: DialogDescriptionProps) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`text-sm text-gray-500 ${className}`}
    {...props}
  />
);

const DialogClose = DialogPrimitive.Close;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
