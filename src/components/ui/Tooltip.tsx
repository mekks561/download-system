import React, { useState } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: TooltipPosition;
  disabled?: boolean;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  disabled = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled) {
    return children;
  }

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  const positionClass = `tooltip-${position}`;

  return (
    <div
      className={`tooltip-wrapper ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div className={`tooltip ${positionClass}`} role="tooltip">
          <div className="tooltip-content">{content}</div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
