import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={20} className="toast-icon success" />,
    error: <AlertCircle size={20} className="toast-icon error" />,
    info: <Info size={20} className="toast-icon info" />
  };

  return (
    <div className={`toast-container toast-${type}`}>
      <div className="toast-content">
        {icons[type] || icons.info}
        <span className="toast-message">{message}</span>
      </div>
      <button onClick={onClose} className="toast-close-btn" aria-label="Close Alert">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
