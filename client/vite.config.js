import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to the Express server, so no CORS setup is needed.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
