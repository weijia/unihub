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
    install: async (url: string) => {
      console.log('[Browser Polyfill] plugin.install:', url);
      try {
        // 实际发起网络请求下载 ZIP 文件
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('[Browser Polyfill] 下载成功:', response.status);
        
        // 模拟安装成功，将插件信息存储到 localStorage
        const pluginId = 'plugin_' + Date.now();
        const plugins = JSON.parse(localStorage.getItem('unihub_plugins') || '[]');
        plugins.push({
          id: pluginId,
          url: url,
          installedAt: new Date().toISOString()
        });
        localStorage.setItem('unihub_plugins', JSON.stringify(plugins));
        
        return { success: true, pluginId };
      } catch (error) {
        console.error('[Browser Polyfill] 下载失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '下载失败' };
      }
    },
    installFromBuffer: async (buffer: number[], filename: string) => {
      console.log('[Browser Polyfill] plugin.installFromBuffer:', filename);
      try {
        // 模拟从文件安装，将插件信息存储到 localStorage
        const pluginId = 'plugin_' + Date.now();
        const plugins = JSON.parse(localStorage.getItem('unihub_plugins') || '[]');
        plugins.push({
          id: pluginId,
          filename: filename,
          installedAt: new Date().toISOString()
        });
        localStorage.setItem('unihub_plugins', JSON.stringify(plugins));
        
        return { success: true, pluginId };
      } catch (error) {
        console.error('[Browser Polyfill] 安装失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '安装失败' };
      }
    },
    uninstall: async (pluginId: string) => {
      console.log('[Browser Polyfill] plugin.uninstall:', pluginId);
      try {
        // 从 localStorage 中移除插件
        const plugins = JSON.parse(localStorage.getItem('unihub_plugins') || '[]');
        const updatedPlugins = plugins.filter((p: any) => p.id !== pluginId);
        localStorage.setItem('unihub_plugins', JSON.stringify(updatedPlugins));
        
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 卸载失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '卸载失败' };
      }
    },
    list: async () => {
      console.log('[Browser Polyfill] plugin.list');
      try {
        // 从 localStorage 中读取插件列表
        const plugins = JSON.parse(localStorage.getItem('unihub_plugins') || '[]');
        return plugins.map((p: any) => ({
          id: p.id,
          enabled: true,
          metadata: {
            id: p.id,
            name: p.filename || p.url.split('/').pop()?.replace('.zip', '') || 'Unknown Plugin',
            description: 'Installed from ' + (p.url || 'local file'),
            version: '1.0.0',
            author: 'Unknown',
            icon: 'M12 4v16m8-8H4',
            category: 'custom',
            keywords: []
          }
        }));
      } catch (error) {
        console.error('[Browser Polyfill] 获取插件列表失败:', error);
        return [];
      }
    },
    checkUpdates: async (marketplaceUrl: string) => {
      console.log('[Browser Polyfill] plugin.checkUpdates:', marketplaceUrl);
      // 模拟检查更新
      return { success: true, updates: [] };
    },
    update: async (pluginId: string, downloadUrl: string) => {
      console.log('[Browser Polyfill] plugin.update:', pluginId, downloadUrl);
      try {
        // 模拟更新插件
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 更新失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '更新失败' };
      }
    },
    load: async (pluginId: string) => {
      console.log('[Browser Polyfill] plugin.load:', pluginId);
      return { success: true };
    },
    open: async (pluginId: string) => {
      console.log('[Browser Polyfill] plugin.open:', pluginId);
      return { success: true };
    },
    close: async (pluginId: string) => {
      console.log('[Browser Polyfill] plugin.close:', pluginId);
      return { success: true };
    },
    destroy: async (pluginId: string) => {
      console.log('[Browser Polyfill] plugin.destroy:', pluginId);
      return { success: true };
    },
    updateBounds: async (pluginId: string, bounds: any) => {
      console.log('[Browser Polyfill] plugin.updateBounds:', pluginId, bounds);
      return { success: true };
    },
    hideForSearch: async () => {
      console.log('[Browser Polyfill] plugin.hideForSearch');
      return { success: true };
    },
    restoreAfterSearch: async () => {
      console.log('[Browser Polyfill] plugin.restoreAfterSearch');
      return { success: true };
    },
    dev: {
      register: async (pluginId: string, devUrl: string, autoReload?: boolean) => {
        console.log('[Browser Polyfill] plugin.dev.register:', pluginId, devUrl);
        return { success: true };
      },
      unregister: async (pluginId: string) => {
        console.log('[Browser Polyfill] plugin.dev.unregister:', pluginId);
        return { success: true };
      },
      isDevMode: async (pluginId: string) => {
        console.log('[Browser Polyfill] plugin.dev.isDevMode:', pluginId);
        return false;
      },
      list: async () => {
        console.log('[Browser Polyfill] plugin.dev.list');
        return [];
      }
    }
  },
  fs: {
    readFile: async (path: string) => {
      console.log('[Browser Polyfill] fs.readFile:', path);
      try {
        // 在浏览器中，我们使用 localStorage 模拟文件系统
        const data = localStorage.getItem('unihub_file_' + path);
        return { success: true, data: data || '' };
      } catch (error) {
        console.error('[Browser Polyfill] 读取文件失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '读取文件失败' };
      }
    },
    writeFile: async (path: string, content: string) => {
      console.log('[Browser Polyfill] fs.writeFile:', path);
      try {
        // 在浏览器中，我们使用 localStorage 模拟文件系统
        localStorage.setItem('unihub_file_' + path, content);
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 写入文件失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '写入文件失败' };
      }
    },
    readDir: async (path: string) => {
      console.log('[Browser Polyfill] fs.readDir:', path);
      try {
        // 模拟读取目录
        return { success: true, data: [] };
      } catch (error) {
        console.error('[Browser Polyfill] 读取目录失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '读取目录失败' };
      }
    },
    exists: async (path: string) => {
      console.log('[Browser Polyfill] fs.exists:', path);
      try {
        // 检查文件是否存在
        const exists = localStorage.getItem('unihub_file_' + path) !== null;
        return { success: true, data: exists };
      } catch (error) {
        console.error('[Browser Polyfill] 检查文件存在失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '检查文件存在失败' };
      }
    },
    stat: async (path: string) => {
      console.log('[Browser Polyfill] fs.stat:', path);
      try {
        // 模拟获取文件状态
        return { success: true, data: { size: 0, mtime: new Date() } };
      } catch (error) {
        console.error('[Browser Polyfill] 获取文件状态失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取文件状态失败' };
      }
    },
    mkdir: async (path: string) => {
      console.log('[Browser Polyfill] fs.mkdir:', path);
      try {
        // 模拟创建目录
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 创建目录失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '创建目录失败' };
      }
    },
    selectFile: async () => {
      console.log('[Browser Polyfill] fs.selectFile');
      try {
        // 模拟选择文件
        return { success: true, data: null };
      } catch (error) {
        console.error('[Browser Polyfill] 选择文件失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '选择文件失败' };
      }
    },
    selectDirectory: async () => {
      console.log('[Browser Polyfill] fs.selectDirectory');
      try {
        // 模拟选择目录
        return { success: true, data: null };
      } catch (error) {
        console.error('[Browser Polyfill] 选择目录失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '选择目录失败' };
      }
    }
  },
  clipboard: {
    readText: async () => {
      console.log('[Browser Polyfill] clipboard.readText');
      try {
        if (!navigator.clipboard) {
          throw new Error('Clipboard API not supported');
        }
        const text = await navigator.clipboard.readText();
        return { success: true, data: text };
      } catch (error) {
        console.error('[Browser Polyfill] 读取剪贴板失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '读取剪贴板失败' };
      }
    },
    writeText: async (text: string) => {
      console.log('[Browser Polyfill] clipboard.writeText:', text);
      try {
        if (!navigator.clipboard) {
          throw new Error('Clipboard API not supported');
        }
        await navigator.clipboard.writeText(text);
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 写入剪贴板失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '写入剪贴板失败' };
      }
    },
    readImage: async () => {
      console.log('[Browser Polyfill] clipboard.readImage');
      try {
        // 浏览器不支持直接读取图片
        return { success: true, data: null };
      } catch (error) {
        console.error('[Browser Polyfill] 读取剪贴板图片失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '读取剪贴板图片失败' };
      }
    },
    writeImage: async (dataUrl: string) => {
      console.log('[Browser Polyfill] clipboard.writeImage');
      try {
        // 浏览器不支持直接写入图片
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 写入剪贴板图片失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '写入剪贴板图片失败' };
      }
    },
    subscribe: async () => {
      console.log('[Browser Polyfill] clipboard.subscribe');
      return { success: true };
    },
    unsubscribe: async () => {
      console.log('[Browser Polyfill] clipboard.unsubscribe');
      return { success: true };
    },
    onChange: (callback: (data: any) => void) => {
      console.log('[Browser Polyfill] clipboard.onChange');
      return () => {}
    }
  },
  system: {
    getInfo: async () => {
      console.log('[Browser Polyfill] system.getInfo');
      try {
        return { success: true, data: {
          platform: 'browser',
          userAgent: navigator.userAgent,
          language: navigator.language
        } };
      } catch (error) {
        console.error('[Browser Polyfill] 获取系统信息失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取系统信息失败' };
      }
    },
    openExternal: async (url: string) => {
      console.log('[Browser Polyfill] system.openExternal:', url);
      try {
        window.open(url, '_blank');
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 打开外部链接失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '打开外部链接失败' };
      }
    },
    showInFolder: async (path: string) => {
      console.log('[Browser Polyfill] system.showInFolder:', path);
      try {
        // 浏览器中无法直接打开文件管理器
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 显示文件夹失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '显示文件夹失败' };
      }
    },
    paste: async () => {
      console.log('[Browser Polyfill] system.paste');
      try {
        // 模拟粘贴操作
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 粘贴失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '粘贴失败' };
      }
    },
    quickPaste: async (options?: any) => {
      console.log('[Browser Polyfill] system.quickPaste:', options);
      try {
        // 模拟快速粘贴操作
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 快速粘贴失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '快速粘贴失败' };
      }
    }
  },
  http: {
    request: async (options: any) => {
      console.log('[Browser Polyfill] http.request:', options);
      try {
        const response = await fetch(options.url, {
          method: options.method || 'GET',
          headers: options.headers,
          body: options.body
        });
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error('[Browser Polyfill] HTTP 请求失败:', error);
        return { success: false, message: error instanceof Error ? error.message : 'HTTP 请求失败' };
      }
    }
  },
  storage: {
    get: async (pluginId: string, key: string) => {
      console.log('[Browser Polyfill] storage.get:', pluginId, key);
      try {
        const value = localStorage.getItem(`unihub_storage_${pluginId}_${key}`);
        return { success: true, data: value ? JSON.parse(value) : null };
      } catch (error) {
        console.error('[Browser Polyfill] 获取存储失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取存储失败' };
      }
    },
    set: async (pluginId: string, key: string, value: any) => {
      console.log('[Browser Polyfill] storage.set:', pluginId, key, value);
      try {
        localStorage.setItem(`unihub_storage_${pluginId}_${key}`, JSON.stringify(value));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 设置存储失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '设置存储失败' };
      }
    },
    delete: async (pluginId: string, key: string) => {
      console.log('[Browser Polyfill] storage.delete:', pluginId, key);
      try {
        localStorage.removeItem(`unihub_storage_${pluginId}_${key}`);
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 删除存储失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '删除存储失败' };
      }
    },
    clear: async (pluginId: string) => {
      console.log('[Browser Polyfill] storage.clear:', pluginId);
      try {
        // 清除该插件的所有存储
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`unihub_storage_${pluginId}_`)) {
            localStorage.removeItem(key);
          }
        }
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 清除存储失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '清除存储失败' };
      }
    }
  },
  app: {
    getPath: async (name: string) => {
      console.log('[Browser Polyfill] app.getPath:', name);
      try {
        // 模拟获取路径
        return { success: true, data: '' };
      } catch (error) {
        console.error('[Browser Polyfill] 获取路径失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取路径失败' };
      }
    }
  },
  sidebar: {
    setCollapsed: async (collapsed: boolean) => {
      console.log('[Browser Polyfill] sidebar.setCollapsed:', collapsed);
      try {
        // 存储侧边栏状态到 localStorage
        localStorage.setItem('unihub_sidebar_collapsed', collapsed.toString());
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 设置侧边栏状态失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '设置侧边栏状态失败' };
      }
    }
  },
  settings: {
    getAll: async () => {
      console.log('[Browser Polyfill] settings.getAll');
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        return { success: true, data: settings };
      } catch (error) {
        console.error('[Browser Polyfill] 获取设置失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取设置失败' };
      }
    },
    getShortcuts: async () => {
      console.log('[Browser Polyfill] settings.getShortcuts');
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        return settings.shortcuts || { globalSearch: 'Ctrl+K' };
      } catch (error) {
        console.error('[Browser Polyfill] 获取快捷键失败:', error);
        return { globalSearch: 'Ctrl+K' };
      }
    },
    setShortcut: async (key: string, value: string) => {
      console.log('[Browser Polyfill] settings.setShortcut:', key, value);
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        if (!settings.shortcuts) {
          settings.shortcuts = {};
        }
        settings.shortcuts[key] = value;
        localStorage.setItem('unihub_settings', JSON.stringify(settings));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 设置快捷键失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '设置快捷键失败' };
      }
    },
    setPluginShortcut: async (pluginId: string, value: string) => {
      console.log('[Browser Polyfill] settings.setPluginShortcut:', pluginId, value);
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        if (!settings.pluginShortcuts) {
          settings.pluginShortcuts = {};
        }
        settings.pluginShortcuts[pluginId] = value;
        localStorage.setItem('unihub_settings', JSON.stringify(settings));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 设置插件快捷键失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '设置插件快捷键失败' };
      }
    },
    removePluginShortcut: async (pluginId: string) => {
      console.log('[Browser Polyfill] settings.removePluginShortcut:', pluginId);
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        if (settings.pluginShortcuts) {
          delete settings.pluginShortcuts[pluginId];
          localStorage.setItem('unihub_settings', JSON.stringify(settings));
        }
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 移除插件快捷键失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '移除插件快捷键失败' };
      }
    },
    update: async (partial: any) => {
      console.log('[Browser Polyfill] settings.update:', partial);
      try {
        const settings = JSON.parse(localStorage.getItem('unihub_settings') || '{}');
        Object.assign(settings, partial);
        localStorage.setItem('unihub_settings', JSON.stringify(settings));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 更新设置失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '更新设置失败' };
      }
    },
    reset: async () => {
      console.log('[Browser Polyfill] settings.reset');
      try {
        localStorage.removeItem('unihub_settings');
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 重置设置失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '重置设置失败' };
      }
    }
  },
  updater: {
    check: async () => {
      console.log('[Browser Polyfill] updater.check');
      try {
        // 模拟检查更新
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 检查更新失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '检查更新失败' };
      }
    },
    download: async () => {
      console.log('[Browser Polyfill] updater.download');
      try {
        // 模拟下载更新
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 下载更新失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '下载更新失败' };
      }
    },
    install: async () => {
      console.log('[Browser Polyfill] updater.install');
      try {
        // 模拟安装更新
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 安装更新失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '安装更新失败' };
      }
    },
    onCheckingForUpdate: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onCheckingForUpdate');
    },
    onUpdateAvailable: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onUpdateAvailable');
    },
    onUpdateNotAvailable: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onUpdateNotAvailable');
    },
    onDownloadProgress: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onDownloadProgress');
    },
    onUpdateDownloaded: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onUpdateDownloaded');
    },
    onError: (callback: () => void) => {
      console.log('[Browser Polyfill] updater.onError');
    }
  },
  search: {
    openPlugin: async (pluginId: string) => {
      console.log('[Browser Polyfill] search.openPlugin:', pluginId);
      try {
        // 模拟打开插件
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 打开插件失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '打开插件失败' };
      }
    },
    close: async () => {
      console.log('[Browser Polyfill] search.close');
      try {
        // 模拟关闭搜索
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 关闭搜索失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '关闭搜索失败' };
      }
    }
  },
  apps: {
    list: async () => {
      console.log('[Browser Polyfill] apps.list');
      try {
        // 模拟应用列表
        return [];
      } catch (error) {
        console.error('[Browser Polyfill] 获取应用列表失败:', error);
        return [];
      }
    },
    listQuick: async () => {
      console.log('[Browser Polyfill] apps.listQuick');
      try {
        // 模拟快速应用列表
        return [];
      } catch (error) {
        console.error('[Browser Polyfill] 获取快速应用列表失败:', error);
        return [];
      }
    },
    open: async (appPath: string) => {
      console.log('[Browser Polyfill] apps.open:', appPath);
      try {
        // 模拟打开应用
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 打开应用失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '打开应用失败' };
      }
    },
    refresh: async () => {
      console.log('[Browser Polyfill] apps.refresh');
      try {
        // 模拟刷新应用列表
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 刷新应用列表失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '刷新应用列表失败' };
      }
    },
    getIcon: async (appPath: string) => {
      console.log('[Browser Polyfill] apps.getIcon:', appPath);
      try {
        // 模拟获取应用图标
        return { success: true, data: null };
      } catch (error) {
        console.error('[Browser Polyfill] 获取应用图标失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '获取应用图标失败' };
      }
    },
    preloadIcons: async (appPaths: string[]) => {
      console.log('[Browser Polyfill] apps.preloadIcons:', appPaths);
      try {
        // 模拟预加载图标
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 预加载图标失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '预加载图标失败' };
      }
    }
  },
  db: {
    addFavorite: async (pluginId: string) => {
      console.log('[Browser Polyfill] db.addFavorite:', pluginId);
      try {
        const favorites = JSON.parse(localStorage.getItem('unihub_favorites') || '[]');
        if (!favorites.includes(pluginId)) {
          favorites.push(pluginId);
          localStorage.setItem('unihub_favorites', JSON.stringify(favorites));
        }
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 添加收藏失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '添加收藏失败' };
      }
    },
    removeFavorite: async (pluginId: string) => {
      console.log('[Browser Polyfill] db.removeFavorite:', pluginId);
      try {
        const favorites = JSON.parse(localStorage.getItem('unihub_favorites') || '[]');
        const updatedFavorites = favorites.filter((id: string) => id !== pluginId);
        localStorage.setItem('unihub_favorites', JSON.stringify(updatedFavorites));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 移除收藏失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '移除收藏失败' };
      }
    },
    isFavorite: async (pluginId: string) => {
      console.log('[Browser Polyfill] db.isFavorite:', pluginId);
      try {
        const favorites = JSON.parse(localStorage.getItem('unihub_favorites') || '[]');
        return favorites.includes(pluginId);
      } catch (error) {
        console.error('[Browser Polyfill] 检查收藏失败:', error);
        return false;
      }
    },
    getFavorites: async () => {
      console.log('[Browser Polyfill] db.getFavorites');
      try {
        const favorites = JSON.parse(localStorage.getItem('unihub_favorites') || '[]');
        return favorites;
      } catch (error) {
        console.error('[Browser Polyfill] 获取收藏失败:', error);
        return [];
      }
    },
    addRecent: async (pluginId: string) => {
      console.log('[Browser Polyfill] db.addRecent:', pluginId);
      try {
        const recents = JSON.parse(localStorage.getItem('unihub_recents') || '[]');
        // 移除旧的记录
        const updatedRecents = recents.filter((id: string) => id !== pluginId);
        // 添加到开头
        updatedRecents.unshift(pluginId);
        // 限制数量
        const limitedRecents = updatedRecents.slice(0, 10);
        localStorage.setItem('unihub_recents', JSON.stringify(limitedRecents));
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 添加最近使用失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '添加最近使用失败' };
      }
    },
    getRecents: async (limit?: number) => {
      console.log('[Browser Polyfill] db.getRecents:', limit);
      try {
        const recents = JSON.parse(localStorage.getItem('unihub_recents') || '[]');
        return limit ? recents.slice(0, limit) : recents;
      } catch (error) {
        console.error('[Browser Polyfill] 获取最近使用失败:', error);
        return [];
      }
    },
    clearRecents: async () => {
      console.log('[Browser Polyfill] db.clearRecents');
      try {
        localStorage.removeItem('unihub_recents');
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 清除最近使用失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '清除最近使用失败' };
      }
    }
  },
  tab: {
    showContextMenu: async (tabId: string, index: number, total: number) => {
      console.log('[Browser Polyfill] tab.showContextMenu:', tabId, index, total);
      try {
        // 模拟显示上下文菜单
        return { success: true };
      } catch (error) {
        console.error('[Browser Polyfill] 显示上下文菜单失败:', error);
        return { success: false, message: error instanceof Error ? error.message : '显示上下文菜单失败' };
      }
    }
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
