/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-Proxy: Frontend auf :5173, Backend lokal auf :5556 (Syno-Port-Mapping).
// 600s-Timeout spiegelt die nginx-Konfiguration (lange N-Body-Sims).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5556',
        changeOrigin: true,
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
  build: {
    target: 'es2022',
    // three.js treibt das Haupt-Bundle über das 500-kB-Default-Limit.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
