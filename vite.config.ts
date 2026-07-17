import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/shadowrun-minigame-template/',
  define: {
    __SOURCE_COMMIT__: JSON.stringify(process.env.VITE_SOURCE_COMMIT ?? 'local-dev'),
  },
  plugins: [react()],
})
