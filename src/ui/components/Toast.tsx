import React, { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<Props> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">{type === 'success' ? '✓' : '✕'}</span>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
};

export default Toast;

