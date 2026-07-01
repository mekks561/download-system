import React from 'react';
import { Button as ShadcnButton, buttonVariants } from './shadcn/Button';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, 'default' | 'secondary' | 'destructive'> = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
};

const sizeMap: Record<ButtonSize, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  icon,
}) => {
  const shadcnVariant = variantMap[variant];
  const shadcnSize = sizeMap[size];

  return (
    <ShadcnButton
      type={type}
      variant={shadcnVariant}
      size={shadcnSize}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
    >
      {loading && <span className="animate-spin mr-2">⌛</span>}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </ShadcnButton>
  );
};

export default Button;