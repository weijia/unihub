import { resolve } from 'path'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    build: {
      outDir: 'out/main',
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  preload: {
    entry: 'src/preload/index.ts',
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    base: './',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    build: {
      outDir: 'out/renderer',
      target: 'chrome120',
      sourcemap: true
    },
    server: {
      port: 3000,
      open: true
    }
  }
})
