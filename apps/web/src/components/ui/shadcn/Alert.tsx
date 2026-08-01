import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-current [&>svg+div]:translate-y-[-2px] [&>svg]:left-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-blue-50 border-blue-200 text-blue-900 [&>svg]:text-blue-500',
        destructive: 'bg-red-50 border-red-200 text-red-900 [&>svg]:text-red-500',
        success: 'bg-green-50 border-green-200 text-green-900 [&>svg]:text-green-500',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 [&>svg]:text-yellow-500',
        info: 'bg-gray-50 border-gray-200 text-gray-900 [&>svg]:text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    ref?: React.Ref<HTMLDivElement>;
  };

const Alert = ({ className, variant, ref, ...props }: AlertProps) => (
  <div ref={ref} role="alert" className={alertVariants({ variant, className })} {...props} />
);

export interface AlertTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

const AlertTitle = ({ className, ref, ...props }: AlertTitleProps) => (
  <h5 ref={ref} className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />
);

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

const AlertDescription = ({ className, ref, ...props }: AlertDescriptionProps) => (
  <p ref={ref} className={`text-sm opacity-90 ${className}`} {...props} />
);

export { Alert, AlertTitle, AlertDescription };
