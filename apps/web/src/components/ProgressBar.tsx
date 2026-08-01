import React, { useMemo } from 'react';
import { Progress } from './ui/shadcn';

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
  const clampedProgress = Math.min(progress, 100);
  const labelText = useMemo(() => Math.round(progress), [progress]);

  const cssVars = useMemo(() => ({
    '--progress-color': color,
    '--progress-height': `${height}px`,
  } as React.CSSProperties), [color, height]);

  return (
    <div className="relative w-full" style={cssVars}>
      <Progress
        value={clampedProgress}
        className="w-full [&>div]:bg-[var(--progress-color)]"
        style={{ height: 'var(--progress-height)' }}
      />
      {showLabel && (
        <span className="text-xs text-gray-500 absolute right-0 -top-5">
          {labelText}%
        </span>
      )}
    </div>
  );
};

export { ProgressBar };
export default ProgressBar;
