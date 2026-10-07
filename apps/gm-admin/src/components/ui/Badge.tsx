import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800',
        secondary: 'bg-gray-100 text-gray-800',
        outline: 'border border-gray-200 text-gray-800',
        success: 'bg-success-100 text-success-800',
        warning: 'bg-warning-100 text-warning-800',
        error: 'bg-error-100 text-error-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={badgeVariants({ variant, className })} {...props} />;
}

export { Badge, badgeVariants };