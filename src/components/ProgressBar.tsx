import React, { useMemo } from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = '#4f46e5',
  showLabel = true,
  height = 8,
}) => {
  const fillStyle = useMemo(() => ({
    width: `${Math.min(progress, 100)}%`,
    backgroundColor: color,
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  }), [progress, color]);

  const containerStyle = useMemo(() => ({
    height: `${height}px`
  }), [height]);

  const labelText = useMemo(() => Math.round(progress), [progress]);

  return (
    <div className="progress-bar-container" style={containerStyle}>
      <div
        className="progress-bar-fill"
        style={fillStyle}
      />
      {showLabel && (
        <span className="progress-bar-label">
          {labelText}%
        </span>
      )}
    </div>
  );
};

export { ProgressBar };
export default ProgressBar;
