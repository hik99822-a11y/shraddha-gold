/**
 * Utility functions for strict Indian Standard Time (IST) formatting
 */

export const formatDateIST = (dateObj, options = {}) => {
  if (!dateObj) return '';
  const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
};

export const formatTimeIST = (dateObj, options = {}) => {
  if (!dateObj) return '';
  const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
};

export const formatDateTimeIST = (dateObj, options = {}) => {
  if (!dateObj) return '';
  const d = typeof dateObj === 'string' ? new Date(dateObj) : dateObj;
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
};
