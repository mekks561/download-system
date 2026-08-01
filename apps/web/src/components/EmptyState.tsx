import React from 'react';
import { Button } from './ui/shadcn';

interface ActionConfig {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ActionConfig;
  imageUrl?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  imageUrl
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 min-h-[300px]">
      <div className="text-center max-w-[400px]">
        {icon ? (
          <div className="mb-6">
            <span className="text-[80px] block">{icon}</span>
          </div>
        ) : imageUrl ? (
          <div className="mb-6">
            <img
              src={imageUrl}
              alt={title}
              className="w-[200px] h-[200px] object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="mb-6">
            <span className="text-[80px] block">📭</span>
          </div>
        )}

        <h3 className="m-0 mb-3 text-xl font-semibold text-gray-800">
          {title}
        </h3>

        {description && (
          <p className="m-0 mb-6 text-[15px] leading-relaxed text-gray-500">
            {description}
          </p>
        )}

        {action && (
          <Button
            variant={action.type === 'secondary' ? 'outline' : 'default'}
            onClick={action.onClick}
            className="px-6 py-3 text-[15px] font-semibold h-auto"
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
