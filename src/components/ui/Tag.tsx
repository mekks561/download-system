import React from 'react';

export interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

const Tag: React.FC<TagProps> = ({
  children,
  variant = 'default',
  closable = false,
  onClose,
  className = '',
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  };

  const baseClasses = 'tag';
  const variantClass = `tag-${variant}`;

  const combinedClasses = [
    baseClasses,
    variantClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      <span className="tag-text">{children}</span>
      {closable && (
        <button
          type="button"
          className="tag-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </span>
  );
};

export default Tag;
