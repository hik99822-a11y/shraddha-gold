import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import secureStorage from '../utils/secureStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => secureStorage.getItem('shraddha_gold_token'));
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = secureStorage.getItem('shraddha_gold_token');
      const storedUser = secureStorage.getItem('shraddha_gold_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Verify with backend silently
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            secureStorage.setItem('shraddha_gold_user', JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn('[AuthContext] Session invalid or expired. Logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Global listener for 401 unauthorized errors from API
    const handleUnauthorized = (e) => {
      console.warn('[AuthContext] 401 Unauthorized intercepted. Logging out.', e.detail);
      logout();
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  // Auto-logout for customers when accessEnd is reached
  useEffect(() => {
    if (user && user.role === 'customer' && user.accessEnd) {
      const checkExpiry = () => {
        if (new Date(user.accessEnd) <= new Date()) {
          console.warn('[AuthContext] Customer access period expired. Auto-logging out.');
          logout();
        }
      };
      
      checkExpiry(); // check immediately on mount or user change
      const intervalId = setInterval(checkExpiry, 60000); // Check every minute
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const response = await authApi.login({ identifier, password });
      if (response.success && response.token) {
        setToken(response.token);
        setUser(response.user);
        secureStorage.setItem('shraddha_gold_token', response.token);
        secureStorage.setItem('shraddha_gold_user', JSON.stringify(response.user));
        return { success: true, user: response.user, message: response.message };
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    secureStorage.removeItem('shraddha_gold_token');
    secureStorage.removeItem('shraddha_gold_user');
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      secureStorage.setItem('shraddha_gold_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
