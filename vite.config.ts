import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Native filesystem events are unreliable in some sandboxed environments,
    // which leaves the dev server serving stale modules. Polling guarantees
    // edits are picked up and hot-reloaded.
    watch: {
      usePolling: true,
      interval: 150,
    },
  },
})
