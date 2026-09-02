import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The API is a separate ASP.NET Core process in development. Proxying /api through Vite keeps the
  // browser on a single origin, so dev needs no CORS round trip at all. In production the client
  // talks to Render directly via VITE_API_BASE_URL, and this proxy is not involved.
  const env = loadEnv(mode, '.', '')
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:5233'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true },
      },
    },
  }
})
