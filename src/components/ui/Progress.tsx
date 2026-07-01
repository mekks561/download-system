import React from 'react';

export type ProgressVariant = 'linear' | 'circular';
export type ProgressColor = 'primary' | 'success' | 'warning' | 'danger';

export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  color?: ProgressColor;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  variant = 'linear',
  color = 'primary',
  showValue = false,
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const baseClasses = `progress progress-${variant}`;
  const colorClass = `progress-${color}`;
  const sizeClass = `progress-${size}`;

  const combinedClasses = [
    baseClasses,
    colorClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  if (variant === 'circular') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 24 : 32;
    const strokeWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={combinedClasses}>
        <svg
          className="progress-circular-svg"
          width={radius * 2 + strokeWidth}
          height={radius * 2 + strokeWidth}
        >
          <circle
            className="progress-circular-bg"
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="progress-circular-fill"
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${radius + strokeWidth / 2} ${radius + strokeWidth / 2})`}
          />
        </svg>
        {showValue && (
          <span className="progress-circular-value">{Math.round(percentage)}%</span>
        )}
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      <div className="progress-linear-track">
        <div
          className="progress-linear-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="progress-linear-value">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

export default Progress;