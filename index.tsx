import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { Auth0Provider } from "@auth0/auth0-react";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// In Vite, variables are typically on import.meta.env
// But since we define process.env in vite.config.ts, we can check both
// Cast import.meta to any to bypass TypeScript property checking for env
const AUTH0_DOMAIN = ((import.meta as any).env?.VITE_AUTH0_DOMAIN) || (process.env?.VITE_AUTH0_DOMAIN) || '';
const AUTH0_CLIENT_ID = ((import.meta as any).env?.VITE_AUTH0_CLIENT_ID) || (process.env?.VITE_AUTH0_CLIENT_ID) || '';

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