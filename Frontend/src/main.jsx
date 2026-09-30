import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LandingPageProvider } from './context/LandingPageContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LandingPageProvider>
          <App />
        </LandingPageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
