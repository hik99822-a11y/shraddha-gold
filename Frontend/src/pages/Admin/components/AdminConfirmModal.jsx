import React, { useEffect } from 'react';
import { Trash2, X, RefreshCw, ShieldAlert } from 'lucide-react';

/**
 * Modern Luxury Admin Delete Confirmation Modal
 * Premium, tactile, and clear confirmation popup for destructive actions.
 */
const AdminConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  subtitle = 'Permanent Removal',
  description = 'Are you sure you want to delete this item?',
  itemName = '',
  details = null,
  warning = null,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="admin-delete-modal-backdrop"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="admin-delete-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="admin-delete-modal-close-btn"
          title="Cancel and close"
          aria-label="Close modal"
        >
          <X size={17} />
        </button>

        {/* Modal Header with Icon Halo & Title */}
        <div className="admin-delete-modal-header">
          <div className="admin-delete-icon-halo">
            <Trash2 size={24} strokeWidth={2.2} />
          </div>

          <span className="admin-delete-badge-pill">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            {subtitle || 'Permanent Removal'}
          </span>

          <h3 id="confirm-delete-title" className="admin-delete-modal-title">
            {title}
          </h3>
        </div>

        {/* Modal Body */}
        <div className="admin-delete-modal-body">
          {description && (
            <p className="admin-delete-modal-message">
              {description}
            </p>
          )}

          {itemName && (
            <div style={{ textAlign: 'center' }}>
              <span className="admin-delete-target-highlight">
                {itemName}
              </span>
            </div>
          )}

          {/* Optional Details Key-Value Summary Card */}
          {details && (
            <div className="admin-delete-details-card">
              {details}
            </div>
          )}

          {/* Warning Banner */}
          {warning && (
            <div className="admin-delete-warning-banner">
              <ShieldAlert size={16} className="admin-delete-warning-icon" />
              <span>{warning}</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="admin-delete-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="admin-delete-btn-cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="admin-delete-btn-confirm"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmModal;
