// Browser polyfill for Electron API

// 模拟 electronAPI
export const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => {
      console.log(`[Browser Polyfill] ipcRenderer.send: ${channel}`, args)
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
      console.log(`[Browser Polyfill] ipcRenderer.on: ${channel}`)
      // 模拟事件监听
      return () => {
        console.log(`[Browser Polyfill] ipcRenderer.off: ${channel}`)
      }
    },
    invoke: (channel: string, ...args: any[]) => {
      console.log(`[Browser Polyfill] ipcRenderer.invoke: ${channel}`, args)
      return Promise.resolve({ success: true, data: null })
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      console.log(`[Browser Polyfill] ipcRenderer.removeListener: ${channel}`)
    }
  }
}

// 模拟 api
export const api = {
  plugin: {
    install: (url: string) => Promise.resolve({ success: true }),
    installFromBuffer: (buffer: number[], filename: string) => Promise.resolve({ success: true }),
    uninstall: (pluginId: string) => Promise.resolve({ success: true }),
    list: () => Promise.resolve([]),
    checkUpdates: (marketplaceUrl: string) => Promise.resolve([]),
    update: (pluginId: string, downloadUrl: string) => Promise.resolve({ success: true }),
    load: (pluginId: string) => Promise.resolve({ success: true }),
    open: (pluginId: string) => Promise.resolve({ success: true }),
    close: (pluginId: string) => Promise.resolve({ success: true }),
    destroy: (pluginId: string) => Promise.resolve({ success: true }),
    updateBounds: (pluginId: string, bounds: any) => Promise.resolve({ success: true }),
    hideForSearch: () => Promise.resolve({ success: true }),
    restoreAfterSearch: () => Promise.resolve({ success: true }),
    dev: {
      register: (pluginId: string, devUrl: string, autoReload?: boolean) => Promise.resolve({ success: true }),
      unregister: (pluginId: string) => Promise.resolve({ success: true }),
      isDevMode: (pluginId: string) => Promise.resolve(false),
      list: () => Promise.resolve([])
    }
  },
  fs: {
    readFile: (path: string) => Promise.resolve({ success: true, data: '' }),
    writeFile: (path: string, content: string) => Promise.resolve({ success: true }),
    readDir: (path: string) => Promise.resolve({ success: true, data: [] }),
    exists: (path: string) => Promise.resolve({ success: true, data: false }),
    stat: (path: string) => Promise.resolve({ success: true, data: {} }),
    mkdir: (path: string) => Promise.resolve({ success: true }),
    selectFile: () => Promise.resolve({ success: true, data: null }),
    selectDirectory: () => Promise.resolve({ success: true, data: null })
  },
  clipboard: {
    readText: () => Promise.resolve({ success: true, data: '' }),
    writeText: (text: string) => Promise.resolve({ success: true }),
    readImage: () => Promise.resolve({ success: true, data: null }),
    writeImage: (dataUrl: string) => Promise.resolve({ success: true }),
    subscribe: () => Promise.resolve({ success: true }),
    unsubscribe: () => Promise.resolve({ success: true }),
    onChange: (callback: (data: any) => void) => {
      return () => {}
    }
  },
  system: {
    getInfo: () => Promise.resolve({ success: true, data: { platform: 'browser' } }),
    openExternal: (url: string) => {
      window.open(url, '_blank')
      return Promise.resolve({ success: true })
    },
    showInFolder: (path: string) => Promise.resolve({ success: true }),
    paste: () => Promise.resolve({ success: true }),
    quickPaste: (options?: any) => Promise.resolve({ success: true })
  },
  http: {
    request: (options: any) => Promise.resolve({ success: true, data: {} })
  },
  storage: {
    get: (pluginId: string, key: string) => Promise.resolve({ success: true, data: null }),
    set: (pluginId: string, key: string, value: any) => Promise.resolve({ success: true }),
    delete: (pluginId: string, key: string) => Promise.resolve({ success: true }),
    clear: (pluginId: string) => Promise.resolve({ success: true })
  },
  app: {
    getPath: (name: string) => Promise.resolve({ success: true, data: '' })
  },
  sidebar: {
    setCollapsed: (collapsed: boolean) => Promise.resolve({ success: true })
  },
  settings: {
    getAll: () => Promise.resolve({ success: true, data: {} }),
    getShortcuts: () => Promise.resolve({ globalSearch: 'Ctrl+K' }),
    setShortcut: (key: string, value: string) => Promise.resolve({ success: true }),
    setPluginShortcut: (pluginId: string, value: string) => Promise.resolve({ success: true }),
    removePluginShortcut: (pluginId: string) => Promise.resolve({ success: true }),
    update: (partial: any) => Promise.resolve({ success: true }),
    reset: () => Promise.resolve({ success: true })
  },
  updater: {
    check: () => Promise.resolve({ success: true }),
    download: () => Promise.resolve({ success: true }),
    install: () => Promise.resolve({ success: true }),
    onCheckingForUpdate: (callback: () => void) => {},
    onUpdateAvailable: (callback: () => void) => {},
    onUpdateNotAvailable: (callback: () => void) => {},
    onDownloadProgress: (callback: () => void) => {},
    onUpdateDownloaded: (callback: () => void) => {},
    onError: (callback: () => void) => {}
  },
  search: {
    openPlugin: (pluginId: string) => Promise.resolve({ success: true }),
    close: () => Promise.resolve({ success: true })
  },
  apps: {
    list: () => Promise.resolve([]),
    listQuick: () => Promise.resolve([]),
    open: (appPath: string) => Promise.resolve({ success: true }),
    refresh: () => Promise.resolve({ success: true }),
    getIcon: (appPath: string) => Promise.resolve({ success: true, data: null }),
    preloadIcons: (appPaths: string[]) => Promise.resolve({ success: true })
  },
  db: {
    addFavorite: (pluginId: string) => Promise.resolve({ success: true }),
    removeFavorite: (pluginId: string) => Promise.resolve({ success: true }),
    isFavorite: (pluginId: string) => Promise.resolve(false),
    getFavorites: () => Promise.resolve([]),
    addRecent: (pluginId: string) => Promise.resolve({ success: true }),
    getRecents: (limit?: number) => Promise.resolve([]),
    clearRecents: () => Promise.resolve({ success: true })
  },
  tab: {
    showContextMenu: (tabId: string, index: number, total: number) => Promise.resolve({ success: true })
  }
}

// 模拟 unihubAPI
export const unihubAPI = {
  db: {
    get: async (key: string) => null,
    set: async (key: string, value: any) => {},
    delete: async (key: string) => {},
    keys: async () => [],
    clear: async () => {}
  },
  clipboard: {
    readText: async () => '',
    writeText: async (text: string) => {},
    readImage: async () => null,
    writeImage: async (dataUrl: string) => {},
    subscribe: async () => {},
    unsubscribe: async () => {},
    onChange: (callback: (data: any) => void) => {
      return () => {}
    }
  },
  fs: {
    readFile: async (path: string) => null,
    writeFile: async (path: string, content: string) => false,
    readDir: async (path: string) => [],
    exists: async (path: string) => false,
    stat: async (path: string) => null,
    mkdir: async (path: string) => false,
    selectFile: async () => null,
    selectDirectory: async () => null
  },
  http: {
    get: async (url: string, options?: any) => null,
    post: async (url: string, data: any, options?: any) => null,
    request: async (options: any) => null
  },
  system: {
    getInfo: async () => null,
    openExternal: async (url: string) => {
      window.open(url, '_blank')
      return true
    },
    showInFolder: async (path: string) => false,
    paste: async () => {},
    quickPaste: async (options?: any) => {}
  },
  notification: {
    show: async (options: { title: string; body: string; icon?: string }) => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon
          })
        }
      }
    }
  }
}

// 模拟 nodeAPI
export const nodeAPI = {
  fs: {
    readFile: async (filePath: string) => null,
    writeFile: async (filePath: string, content: string) => null,
    readdir: async (dirPath: string) => [],
    exists: async (filePath: string) => false,
    stat: async (filePath: string) => null,
    mkdir: async (dirPath: string) => null,
    selectFile: async () => null,
    selectDirectory: async () => null
  },
  spawn: async (command: string, args: string[] = [], options: any = {}) => {
    return { stdout: '', stderr: '', exitCode: 0 }
  },
  getPluginDir: async () => ''
}

// 模拟 versions
export const versions = {
  electron: 'browser',
  node: 'browser',
  chrome: 'browser'
}

// 暴露到全局对象
export function initBrowserPolyfill() {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.electron = electronAPI
    // @ts-ignore
    window.api = api
    // @ts-ignore
    window.unihub = unihubAPI
    // @ts-ignore
    window.node = nodeAPI
    // @ts-ignore
    window.versions = versions
  }
}
