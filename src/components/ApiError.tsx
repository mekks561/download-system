import React from 'react';
import { Alert, AlertDescription } from './ui/shadcn';
import { Button } from './ui/shadcn';

interface ApiErrorProps {
  message: string;
  onClose: () => void;
}

const ApiError: React.FC<ApiErrorProps> = ({ message, onClose }) => {
  return (
    <div className="p-4">
      <Alert variant="destructive" className="flex items-start gap-3 pr-12 relative">
        <span className="text-xl">❌</span>
        <div className="flex-1">
          <AlertDescription className="text-base font-medium text-red-900">
            {message}
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={onClose}
        >
          ✕
        </Button>
      </Alert>
    </div>
  );
};

export default ApiError;
