import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path: /en/ for EN build (served from subfolder), / for RU
const base = process.env.VITE_DEFAULT_LANG === 'en' ? '/en/' : '/';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
  },
})
