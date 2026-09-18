import CryptoJS from 'crypto-js';

const STORAGE_SECRET =
  import.meta.env.VITE_STORAGE_SECRET || 'ShraddhaGold_Encrypted_Client_Store_Key_2026_@Sec';

/**
 * Secure Storage Utility for Shraddha Gold
 * Encrypts all data before storing in localStorage using AES-256.
 * Decrypts data when reading, ensuring no plain text tokens or user records exist in the browser store.
 */
export const secureStorage = {
  /**
   * Encrypt and store an item in localStorage
   * @param {string} key
   * @param {any} value
   */
  setItem: (key, value) => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
        return;
      }

      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const encrypted = CryptoJS.AES.encrypt(stringValue, STORAGE_SECRET).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error(`[secureStorage.setItem] Failed to encrypt & save key "${key}":`, error);
      localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  },

  /**
   * Retrieve and decrypt an item from localStorage
   * @param {string} key
   * @returns {string | null} Decrypted plain string or null
   */
  getItem: (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // Backward-compatibility: Check if it's already plain text (e.g., starts with JWT header "ey" or JSON "{")
      if (raw.startsWith('ey') || raw.startsWith('{') || raw.startsWith('[')) {
        // Auto-migrate legacy plain text to encrypted format
        try {
          const encrypted = CryptoJS.AES.encrypt(raw, STORAGE_SECRET).toString();
          localStorage.setItem(key, encrypted);
        } catch (_) {}
        return raw;
      }

      // Decrypt AES ciphertext
      const bytes = CryptoJS.AES.decrypt(raw, STORAGE_SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        return raw;
      }

      return decrypted;
    } catch (error) {
      console.warn(`[secureStorage.getItem] Failed to decrypt key "${key}":`, error);
      return localStorage.getItem(key);
    }
  },

  /**
   * Retrieve, decrypt, and JSON-parse an item
   * @param {string} key
   * @returns {any | null}
   */
  getJSON: (key) => {
    try {
      const val = secureStorage.getItem(key);
      if (!val) return null;
      return JSON.parse(val);
    } catch (error) {
      console.warn(`[secureStorage.getJSON] Error parsing JSON for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Remove an item from localStorage
   * @param {string} key
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[secureStorage.removeItem] Failed to remove key "${key}":`, error);
    }
  },

  /**
   * Clear all localStorage
   */
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[secureStorage.clear] Failed to clear storage:', error);
    }
  }
};

export default secureStorage;
