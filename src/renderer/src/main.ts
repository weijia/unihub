import './style.css'

// 引入浏览器 polyfill
import { initBrowserPolyfill } from './utils/browser-polyfill'

// 初始化浏览器 polyfill（仅在浏览器环境中执行）
if (typeof window !== 'undefined' && !window.electron) {
  initBrowserPolyfill()
  
  // 注册 Service Worker（PWA 支持）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker 注册成功:', registration.scope)
        })
        .catch(error => {
          console.error('Service Worker 注册失败:', error)
        })
    })
  }
}

import { createApp } from 'vue'
import App from './App.vue'
import SearchWindow from './pages/SearchWindow.vue'
import { initPlugins } from './plugins'
import { pluginInstaller } from './plugins/marketplace/installer'

// 根据 hash 决定加载哪个组件
const hash = window.location.hash.slice(1) // 移除 #
const isSearchWindow = hash === '/search' || hash === 'search'

console.log('[main.ts] window.location.hash:', window.location.hash)
console.log('[main.ts] hash:', hash)
console.log('[main.ts] isSearchWindow:', isSearchWindow)

const app = createApp(isSearchWindow ? SearchWindow : App)

// 初始化插件系统
initPlugins().then(() => {
  console.log('✅ 插件系统初始化完成（异步）')
}).catch((err) => {
  console.error('❌ 插件系统初始化失败:', err)
})

// 加载已安装的插件
pluginInstaller.loadInstalledPlugins().catch((error) => {
  console.error('加载插件失败:', error)
})

app.mount('#app')
