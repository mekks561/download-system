import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  text,
  className = '',
}) => {
  const baseClasses = 'divider';
  const orientationClass = `divider-${orientation}`;
  const variantClass = `divider-${variant}`;
  const textClass = text ? 'divider-with-text' : '';

  const combinedClasses = [
    baseClasses,
    orientationClass,
    variantClass,
    textClass,
    className,
  ].filter(Boolean).join(' ');

  if (orientation === 'vertical') {
    return <div className={combinedClasses} role="separator" aria-orientation="vertical" />;
  }

  if (text) {
    return (
      <div className={combinedClasses} role="separator" aria-orientation="horizontal">
        <div className="divider-line divider-line-left" />
        <span className="divider-text">{text}</span>
        <div className="divider-line divider-line-right" />
      </div>
    );
  }

  return <div className={combinedClasses} role="separator" aria-orientation="horizontal" />;
};

export default Divider;