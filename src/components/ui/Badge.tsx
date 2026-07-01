import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const baseClasses = 'badge';
  const variantClass = `badge-${variant}`;
  const sizeClass = `badge-${size}`;

  const combinedClasses = [
    baseClasses,
    variantClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      {dot && <span className="badge-dot"></span>}
      {children}
    </span>
  );
};

export default Badge;
