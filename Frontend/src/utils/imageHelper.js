import { BASE_URL } from '../services/api';

/**
 * Safely constructs a full URL for an image path returned by the backend.
 * This ensures that image paths like `/uploads/...` are securely resolved against the actual API domain
 * without mangling the hostname (which inline replaces often do).
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already an absolute URL
  
  // Only prepend BASE_URL for backend uploaded files
  if (path.startsWith('/uploads')) {
    // Clean BASE_URL: Strip trailing slashes and explicitly strip exactly '/api' from the end
    let base = BASE_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${base}${path}`;
  }
  
  // Return local assets as-is
  return path;
};
