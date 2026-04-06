// 插件适配层，为浏览器环境提供兼容的 API

// 检测运行环境
export const isBrowser = typeof window !== 'undefined' && !window.electron;
export const isElectron = typeof window !== 'undefined' && window.electron;

// 插件存储接口
export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

// 浏览器存储实现
class BrowserStorage implements PluginStorage {
  private prefix: string;

  constructor(pluginId: string) {
    this.prefix = `unihub:${pluginId}:`;
  }

  async get(key: string): Promise<any> {
    try {
      const value = localStorage.getItem(`${this.prefix}${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting storage value:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting storage value:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.error('Error deleting storage value:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }
}

// Electron 存储实现
class ElectronStorage implements PluginStorage {
  private pluginId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async get(key: string): Promise<any> {
    try {
      const result = await window.unihub.db.get(key);
      return result;
    } catch (error) {
      console.error('Error getting storage value:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await window.unihub.db.set(key, value);
    } catch (error) {
      console.error('Error setting storage value:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await window.unihub.db.delete(key);
    } catch (error) {
      console.error('Error deleting storage value:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await window.unihub.db.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys = await window.unihub.db.keys();
      return keys;
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }
}

// 剪贴板接口
export interface PluginClipboard {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
  readImage: () => Promise<string | null>;
  writeImage: (dataUrl: string) => Promise<void>;
}

// 浏览器剪贴板实现
class BrowserClipboard implements PluginClipboard {
  async readText(): Promise<string> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not supported');
      }
      const text = await navigator.clipboard.readText();
      return text;
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }

  async writeText(text: string): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not supported');
      }
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error writing clipboard:', error);
    }
  }

  async readImage(): Promise<string | null> {
    console.warn('Reading image from clipboard not supported in browser');
    return null;
  }

  async writeImage(dataUrl: string): Promise<void> {
    console.warn('Writing image to clipboard not supported in browser');
  }
}

// Electron 剪贴板实现
class ElectronClipboard implements PluginClipboard {
  async readText(): Promise<string> {
    try {
      const text = await window.unihub.clipboard.readText();
      return text;
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }

  async writeText(text: string): Promise<void> {
    try {
      await window.unihub.clipboard.writeText(text);
    } catch (error) {
      console.error('Error writing clipboard:', error);
    }
  }

  async readImage(): Promise<string | null> {
    try {
      const image = await window.unihub.clipboard.readImage();
      return image;
    } catch (error) {
      console.error('Error reading image from clipboard:', error);
      return null;
    }
  }

  async writeImage(dataUrl: string): Promise<void> {
    try {
      await window.unihub.clipboard.writeImage(dataUrl);
    } catch (error) {
      console.error('Error writing image to clipboard:', error);
    }
  }
}

// 系统接口
export interface PluginSystem {
  openExternal: (url: string) => Promise<boolean>;
  getInfo: () => Promise<any>;
}

// 浏览器系统实现
class BrowserSystem implements PluginSystem {
  async openExternal(url: string): Promise<boolean> {
    try {
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error('Error opening external URL:', error);
      return false;
    }
  }

  async getInfo(): Promise<any> {
    return {
      platform: 'browser',
      userAgent: navigator.userAgent
    };
  }
}

// Electron 系统实现
class ElectronSystem implements PluginSystem {
  async openExternal(url: string): Promise<boolean> {
    try {
      const result = await window.unihub.system.openExternal(url);
      return result;
    } catch (error) {
      console.error('Error opening external URL:', error);
      return false;
    }
  }

  async getInfo(): Promise<any> {
    try {
      const info = await window.unihub.system.getInfo();
      return info;
    } catch (error) {
      console.error('Error getting system info:', error);
      return {};
    }
  }
}

// HTTP 接口
export interface PluginHttp {
  get: (url: string, options?: any) => Promise<any>;
  post: (url: string, data: any, options?: any) => Promise<any>;
  request: (options: any) => Promise<any>;
}

// 浏览器 HTTP 实现
class BrowserHttp implements PluginHttp {
  async get(url: string, options?: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('Error making GET request:', error);
      return null;
    }
  }

  async post(url: string, data: any, options?: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        body: JSON.stringify(data),
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('Error making POST request:', error);
      return null;
    }
  }

  async request(options: any): Promise<any> {
    try {
      const response = await fetch(options.url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('Error making request:', error);
      return null;
    }
  }
}

// Electron HTTP 实现
class ElectronHttp implements PluginHttp {
  async get(url: string, options?: any): Promise<any> {
    try {
      const result = await window.unihub.http.get(url, options);
      return result;
    } catch (error) {
      console.error('Error making GET request:', error);
      return null;
    }
  }

  async post(url: string, data: any, options?: any): Promise<any> {
    try {
      const result = await window.unihub.http.post(url, data, options);
      return result;
    } catch (error) {
      console.error('Error making POST request:', error);
      return null;
    }
  }

  async request(options: any): Promise<any> {
    try {
      const result = await window.unihub.http.request(options);
      return result;
    } catch (error) {
      console.error('Error making request:', error);
      return null;
    }
  }
}

// 插件 API 适配器
export class PluginAdapter {
  private pluginId: string;
  private storage: PluginStorage;
  private _clipboard: PluginClipboard;
  private _system: PluginSystem;
  private _http: PluginHttp;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.storage = isBrowser ? new BrowserStorage(pluginId) : new ElectronStorage(pluginId);
    this._clipboard = isBrowser ? new BrowserClipboard() : new ElectronClipboard();
    this._system = isBrowser ? new BrowserSystem() : new ElectronSystem();
    this._http = isBrowser ? new BrowserHttp() : new ElectronHttp();
  }

  get db(): PluginStorage {
    return this.storage;
  }

  get clipboard(): PluginClipboard {
    return this._clipboard;
  }

  get system(): PluginSystem {
    return this._system;
  }

  get http(): PluginHttp {
    return this._http;
  }

  // 通知 API
  async showNotification(options: { title: string; body: string; icon?: string }): Promise<void> {
    if (isBrowser) {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon
          });
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification(options.title, {
              body: options.body,
              icon: options.icon
            });
          }
        }
      }
    } else {
      try {
        await window.unihub.notification.show(options);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }
}

// 创建插件 API 实例
export function createPluginAPI(pluginId: string): PluginAdapter {
  return new PluginAdapter(pluginId);
}

// 导出环境信息
export const environment = {
  isBrowser,
  isElectron,
  platform: isBrowser ? 'browser' : 'electron'
};
