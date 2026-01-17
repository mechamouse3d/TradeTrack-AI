import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { Auth0Provider } from "@auth0/auth0-react";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Safely retrieve environment variables.
 * In Vite environments, these are on import.meta.env.
 * In some other environments, they might be on process.env.
 */
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    console.warn(`Error accessing environment variable ${key}:`, e);
  }
  return '';
};

const AUTH0_DOMAIN = getEnvVar('VITE_AUTH0_DOMAIN');
const AUTH0_CLIENT_ID = getEnvVar('VITE_AUTH0_CLIENT_ID');

// Log a warning if config is missing, but don't crash
if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  console.warn(
    "Auth0 configuration is missing. Authentication features will be disabled. " +
    "Check your environment variables or Docker build arguments."
  );
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </Auth0Provider>
  </React.StrictMode>
);