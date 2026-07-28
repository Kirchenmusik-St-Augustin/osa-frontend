import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Vite 5+ rejects unrecognized Host headers by default -- Caddy proxies
    // the dev domain straight through, so it must be allowlisted here (see
    // vb-intern's identical need for intern.vindobona2.at.dev.schimpl.cc).
    allowedHosts: ['einteilung.hochamt.at.dev.schimpl.cc'],
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 1000 },
})
