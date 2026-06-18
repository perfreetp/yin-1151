import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  base: './',
  plugins: [
    electron({
      main: {
        entry: 'electron/main.ts'
      }
    })
  ],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173
  }
})
