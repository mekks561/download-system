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
  const sizeMap = useMemo(() => ({
    small: { spinner: 20, font: 16 },
    medium: { spinner: 40, font: 24 },
    large: { spinner: 60, font: 32 }
  }), []);

  const currentSize = sizeMap[size];

  const spinnerStyle = useMemo(() => ({
    ...styles.spinner,
    width: currentSize.spinner,
    height: currentSize.spinner,
    borderTopColor: color,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent'
  }), [currentSize.spinner, color]);

  const renderSpinner = () => {
    switch (type) {
      case 'spinner':
        return (
          <div style={styles.spinnerContainer}>
            <div style={spinnerStyle} />
          </div>
        );
      
      case 'dots':
        return (
          <div style={styles.dotsContainer}>
            <span style={{ ...styles.dot, backgroundColor: color, animationDelay: '0s' }} />
            <span style={{ ...styles.dot, backgroundColor: color, animationDelay: '0.2s' }} />
            <span style={{ ...styles.dot, backgroundColor: color, animationDelay: '0.4s' }} />
          </div>
        );
      
      case 'pulse':
        return (
          <div style={styles.pulseContainer}>
            <div style={{ ...styles.pulse, backgroundColor: color }} />
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {renderSpinner()}
      {text && (
        <p style={{ ...styles.text, fontSize: currentSize.font }}>
          {text}
        </p>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '20px',
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    border: '3px solid #e5e7eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  dotsContainer: {
    display: 'flex',
    gap: '8px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out both',
  },
  pulseContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  text: {
    margin: 0,
    color: '#6b7280',
    fontWeight: '500',
  },
};

export default LoadingSpinner;
