import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig({
  root: './src/renderer',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      vue: 'vue/dist/vue.esm-bundler.js',
      // PouchDB 浏览器兼容
      stream: 'stream-browserify'
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // 模拟 Electron 环境变量
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // PouchDB 浏览器兼容
    'process.env.POUCHDB_NAME': JSON.stringify('unihub-settings'),
    'global': 'window',
    'process': JSON.stringify({
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    })
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
        'masked-icon.svg'
      ],
      manifest: {
        name: 'UniHub',
        short_name: 'UniHub',
        description: '多功能工具集合',
        theme_color: '#3b82f6',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  // PWA 相关配置
  publicDir: 'public',
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html')
      },
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      },
      output: {
        manualChunks(id): string | undefined {
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-core'
          }
          if (id.includes('node_modules/reka-ui')) {
            return 'reka-ui'
          }
          if (id.includes('node_modules/lucide-vue-next')) {
            return 'lucide-icons'
          }
          if (id.includes('node_modules/@radix-icons')) {
            return 'radix-icons'
          }
          if (id.includes('node_modules/highlight.js')) {
            return 'highlight'
          }
          if (
            id.includes('node_modules/jose') ||
            id.includes('node_modules/otpauth') ||
            id.includes('node_modules/qrcode-generator')
          ) {
            return 'crypto-utils'
          }
          if (
            id.includes('node_modules/js-yaml') ||
            id.includes('node_modules/smol-toml') ||
            id.includes('node_modules/xml-js')
          ) {
            return 'parsers'
          }
          if (id.includes('node_modules/@vueuse/')) {
            return 'vueuse'
          }
          if (id.includes('node_modules/tailwind') || id.includes('node_modules/clsx')) {
            return 'styles'
          }
          if (id.includes('node_modules/prettier')) {
            return 'prettier'
          }
          if (id.includes('node_modules/pouchdb') || id.includes('node_modules/universal-sync-v2')) {
            return 'sync-libs'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          return undefined
        }
      }
    },
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    sourcemap: true,
    assetsInlineLimit: 4096,
    cssMinify: 'esbuild'
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false
    }
  }
})
