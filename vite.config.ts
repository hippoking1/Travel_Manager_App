import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // GitHub Pages 部署路徑: https://hippoking1.github.io/Travel_Manager_App/
  base: mode === 'production' ? '/Travel_Manager_App/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}));
