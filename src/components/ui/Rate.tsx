import React, { useState } from 'react';
import './Rate.css';

export interface RateProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  count?: number;
  disabled?: boolean;
  allowHalf?: boolean;
  className?: string;
}

const Rate: React.FC<RateProps> = ({
  value: controlledValue,
  defaultValue = 0,
  onChange,
  count = 5,
  disabled = false,
  allowHalf = false,
  className = '',
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const currentValue = controlledValue !== undefined ? controlledValue : defaultValue;
  const displayValue = hoverValue !== null ? hoverValue : currentValue;

  const handleClick = (index: number) => {
    if (disabled) return;
    const newValue = index + 1;
    if (!controlledValue) {
      onChange?.(newValue);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (disabled) return;
    setHoverValue(index + 1);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const getStarStyle = (index: number) => {
    const starValue = index + 1;
    const isFilled = displayValue >= starValue;
    const isHalf = allowHalf && displayValue >= starValue - 0.5 && displayValue < starValue;
    return {
      filled: isFilled,
      half: isHalf,
    };
  };

  return (
    <div
      className={`rate${className ? ` ${className}` : ''}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: count }).map((_, index) => {
        const { filled, half } = getStarStyle(index);
        return (
          <button
            key={index}
            className={`rate-star${filled ? ' filled' : ''}${half ? ' half' : ''}${disabled ? ' disabled' : ''}`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            disabled={disabled}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default Rate;