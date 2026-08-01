import React, { useMemo } from 'react';

interface LoadingSpinnerProps {
  type?: 'spinner' | 'dots' | 'pulse';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = 'spinner',
  size = 'medium',
  text,
  color = '#3b82f6'
}) => {
  const sizeConfig = useMemo(() => ({
    small: { spinner: 'w-5 h-5', font: 'text-base', dotSize: 'w-2.5 h-2.5', pulseSize: 'w-5 h-5' },
    medium: { spinner: 'w-10 h-10', font: 'text-2xl', dotSize: 'w-2.5 h-2.5', pulseSize: 'w-5 h-5' },
    large: { spinner: 'w-[60px] h-[60px]', font: 'text-3xl', dotSize: 'w-2.5 h-2.5', pulseSize: 'w-5 h-5' }
  }), []);

  const currentSize = sizeConfig[size];

  const renderSpinner = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className="flex items-center justify-center">
            <div
              className={`${currentSize.spinner} border-gray-200 rounded-full animate-spin`}
              style={{ borderWidth: '3px', borderTopColor: color, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
            />
          </div>
        );

      case 'dots':
        return (
          <div className="flex gap-2">
            <span
              className={`${currentSize.dotSize} rounded-full animate-bounce`}
              style={{ backgroundColor: color, animationDelay: '0s' }}
            />
            <span
              className={`${currentSize.dotSize} rounded-full animate-bounce`}
              style={{ backgroundColor: color, animationDelay: '0.2s' }}
            />
            <span
              className={`${currentSize.dotSize} rounded-full animate-bounce`}
              style={{ backgroundColor: color, animationDelay: '0.4s' }}
            />
          </div>
        );

      case 'pulse':
        return (
          <div className="flex items-center justify-center">
            <div
              className={`${currentSize.pulseSize} rounded-full animate-pulse`}
              style={{ backgroundColor: color }}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-5">
      {renderSpinner()}
      {text && (
        <p className={`m-0 font-medium text-gray-500 ${currentSize.font}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
