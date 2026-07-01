import React from 'react';

interface ApiErrorProps {
  message: string;
  onClose: () => void;
}

const ApiError: React.FC<ApiErrorProps> = ({ message, onClose }) => {
  return (
    <div className="api-error">
      <div className="api-error-content">
        <span className="api-error-icon">❌</span>
        <span className="api-error-message">{message}</span>
        <button className="api-error-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
};

export default ApiError;
