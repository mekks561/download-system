import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  label,
  className = '',
}) => {
  const baseClasses = 'spinner';
  const sizeClass = `spinner-${size}`;
  const variantClass = `spinner-${variant}`;

  const combinedClasses = [
    baseClasses,
    sizeClass,
    variantClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClasses} role="status" aria-label={label || 'Loading'}>
      <div className="spinner-circle"></div>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
};

export default Spinner;