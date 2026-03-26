import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          loader: resolve(__dirname, 'src/renderer/loader.html'),
          models: resolve(__dirname, 'src/renderer/models.html'),
          about: resolve(__dirname, 'src/renderer/about.html'),
        },
      },
    },
  },
})
