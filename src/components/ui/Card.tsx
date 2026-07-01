import React from 'react';
import { Card as ShadcnCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './shadcn/Card';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const paddingMap: Record<string, string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  footer,
  variant = 'default',
  padding = 'md',
  className = '',
}) => {
  const variantClasses = {
    default: '',
    outlined: 'border-2',
    elevated: 'shadow-lg',
  };

  const paddingClass = paddingMap[padding];

  const combinedClasses = [
    variantClasses[variant],
    paddingClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <ShadcnCard className={combinedClasses}>
      {(title || subtitle) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </ShadcnCard>
  );
};

export default Card;