
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  // Fix: Explicitly cast process to any to resolve TS error 'Property cwd does not exist on type Process' in restricted environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // We define the whole process.env object as a stringified literal.
      // This is the most reliable way to polyfill process.env in a Vite/Browser environment
      // so that properties like process.env.API_KEY are accessible at runtime.
      'process.env': JSON.stringify({
        API_KEY: env.VITE_GOOGLE_API_KEY || env.API_KEY || '',
        VITE_AUTH0_DOMAIN: env.VITE_AUTH0_DOMAIN || '',
        VITE_AUTH0_CLIENT_ID: env.VITE_AUTH0_CLIENT_ID || '',
        NODE_ENV: mode,
      })
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});
