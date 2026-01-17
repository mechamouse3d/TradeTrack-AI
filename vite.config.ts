import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This is the critical part: it maps the build-time env var to the 
      // specific property the Gemini SDK expects.
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || env.API_KEY),
      // Also ensure standard process.env exists for general compatibility
      'process.env': {
        VITE_AUTH0_DOMAIN: JSON.stringify(env.VITE_AUTH0_DOMAIN),
        VITE_AUTH0_CLIENT_ID: JSON.stringify(env.VITE_AUTH0_CLIENT_ID),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});