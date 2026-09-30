import React, { createContext, useContext, useState, useEffect } from 'react';
import { landingPageApi } from '../services/api';

const LandingPageContext = createContext();

export const useLandingPage = () => {
  return useContext(LandingPageContext);
};

export const LandingPageProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await landingPageApi.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to fetch landing page settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return (
    <LandingPageContext.Provider value={{ settings, loading }}>
      {children}
    </LandingPageContext.Provider>
  );
};
