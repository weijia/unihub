import { sync } from 'universal-sync-v2'
import PouchDB from 'pouchdb'
import { createLogger } from '../shared/logger'
import { settingsManager } from './settings-manager'
import { createWebDAVFileSystem } from 'zen-fs-webdav'

const logger = createLogger('sync')

export interface SyncStatus {
  enabled: boolean
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  error?: string
}

export class SyncManager {
  private db: PouchDB.Database
  private syncInterval: NodeJS.Timeout | null = null
  private status: SyncStatus = {
    enabled: false,
    lastSync: null,
    status: 'idle'
  }

  constructor() {
    this.db = new PouchDB('unihub-settings')
  }

  /**
   * 初始化同步管理器
   */
  async init(): Promise<void> {
    const settings = settingsManager.getAll()
    this.status.enabled = settings.sync.enabled

    // 初始化时从 PouchDB 加载设置
    await this.loadSettingsFromDb()

    if (settings.sync.enabled) {
      this.startAutoSync()
    }
  }

  /**
   * 按类别存储设置到 PouchDB
   */
  private async storeSettings(): Promise<void> {
    const settings = settingsManager.getAll()
    const categories = [
      { id: 'settings:shortcuts', data: settings.shortcuts },
      { id: 'settings:pluginShortcuts', data: settings.pluginShortcuts },
      { id: 'settings:general', data: settings.general },
      { id: 'settings:appearance', data: settings.appearance },
      { id: 'settings:sync', data: settings.sync }
    ]

    for (const category of categories) {
      try {
        // 尝试获取现有文档
        const doc = await this.db.get(category.id)
        // 更新文档
        await this.db.put({
          ...doc,
          data: category.data,
          updatedAt: new Date().toISOString()
        })
      } catch (error: any) {
        // 文档不存在，创建新文档
        if (error.name === 'not_found') {
          await this.db.put({
            _id: category.id,
            data: category.data,
            updatedAt: new Date().toISOString()
          })
        } else {
          logger.error({ err: error }, `存储 ${category.id} 失败`)
        }
      }
    }
  }

  /**
   * 从 PouchDB 加载设置
   */
  private async loadSettingsFromDb(): Promise<boolean> {
    const categories = [
      { id: 'settings:shortcuts', key: 'shortcuts' },
      { id: 'settings:pluginShortcuts', key: 'pluginShortcuts' },
      { id: 'settings:general', key: 'general' },
      { id: 'settings:appearance', key: 'appearance' },
      { id: 'settings:sync', key: 'sync' }
    ]

    const settings = settingsManager.getAll()
    let hasUpdates = false

    for (const category of categories) {
      try {
        const doc = await this.db.get(category.id)
        const categoryKey = category.key as keyof typeof settings
        
        // 比较时间戳，决定是否更新本地设置
        const localUpdatedAt = (settings as any)[`${categoryKey}UpdatedAt`] || new Date(0).toISOString()
        if (doc.updatedAt > localUpdatedAt) {
          (settings as any)[categoryKey] = doc.data
          (settings as any)[`${categoryKey}UpdatedAt`] = doc.updatedAt
          hasUpdates = true
        }
      } catch (error: any) {
        // 文档不存在时忽略
        if (error.name !== 'not_found') {
          logger.error({ err: error }, `加载 ${category.id} 失败`)
        }
      }
    }

    if (hasUpdates) {
      settingsManager.update(settings)
    }

    return hasUpdates
  }

  /**
   * 创建 WebDAV 文件系统适配器，使其与 universal-sync-v2 期望的 fs 接口兼容
   */
  private createWebDAVAdapter(webdavFs: any) {
    return {
      access: async (path: string) => {
        try {
          const exists = await webdavFs.exists(path)
          if (!exists) {
            throw new Error('File not found')
          }
        } catch (error) {
          throw error
        }
      },
      writeFile: async (path: string, data: any) => {
        try {
          await webdavFs.writeFile(path, data, { overwrite: true, contentType: 'application/json' })
        } catch (error) {
          throw error
        }
      },
      readFile: async (path: string) => {
        try {
          const content = await webdavFs.readFile(path, { responseType: 'text' })
          return content as string
        } catch (error) {
          throw error
        }
      },
      mkdir: async (path: string) => {
        try {
          await webdavFs.mkdir(path, { recursive: true })
        } catch (error) {
          throw error
        }
      },
      readdir: async (path: string) => {
        try {
          const entries = await webdavFs.readDir(path)
          return entries.map((entry: any) => entry.name)
        } catch (error) {
          throw error
        }
      },
      unlink: async (path: string) => {
        try {
          await webdavFs.unlink(path)
        } catch (error) {
          throw error
        }
      },
      rm: async (path: string, options: any) => {
        try {
          await webdavFs.rm(path, { recursive: options?.recursive || false })
        } catch (error) {
          throw error
        }
      },
      stat: async (path: string) => {
        try {
          const stats = await webdavFs.stat(path)
          return {
            isFile: () => stats.isFile,
            isDirectory: () => stats.isDirectory,
            size: stats.size,
            mtime: stats.lastModified || new Date()
          }
        } catch (error) {
          throw error
        }
      },
      rename: async (oldPath: string, newPath: string) => {
        try {
          await webdavFs.move(oldPath, newPath, { overwrite: true })
        } catch (error) {
          throw error
        }
      },
      exists: async (path: string) => {
        try {
          return await webdavFs.exists(path)
        } catch (error) {
          return false
        }
      }
    }
  }

  /**
   * 执行同步操作
   */
  async sync(): Promise<{ success: boolean; message?: string }> {
    try {
      this.status.status = 'syncing'
      logger.info('开始同步配置')

      const settings = settingsManager.getAll()
      
      if (!settings.sync.enabled) {
        return { success: false, message: '同步未启用' }
      }

      if (!settings.sync.webdav.url) {
        return { success: false, message: 'WebDAV URL 未配置' }
      }

      // 创建 WebDAV 文件系统实例
      const webdavFs = createWebDAVFileSystem({
        baseUrl: settings.sync.webdav.url,
        username: settings.sync.webdav.username || '',
        password: settings.sync.webdav.password || ''
      })

      // 创建适配器
      const fsAdapter = this.createWebDAVAdapter(webdavFs)

      // 1. 先从 WebDAV 同步数据到 PouchDB
      await sync(this.db, fsAdapter, '/')

      // 2. 从 PouchDB 加载最新设置
      await this.loadSettingsFromDb()

      // 3. 将本地设置存储到 PouchDB
      await this.storeSettings()

      // 4. 再次同步到 WebDAV，确保所有更改都已上传
      await sync(this.db, fsAdapter, '/')

      this.status.lastSync = new Date().toISOString()
      this.status.status = 'success'
      logger.info('配置同步成功')

      return { success: true }
    } catch (error) {
      logger.error({ err: error }, '同步失败')
      this.status.status = 'error'
      this.status.error = error instanceof Error ? error.message : '同步失败'
      return { success: false, message: this.status.error }
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync(): void {
    this.stopAutoSync() // 先停止现有同步

    const settings = settingsManager.getAll()
    if (!settings.sync.enabled) return

    const interval = settings.sync.webdav.syncInterval * 60 * 1000
    this.syncInterval = setInterval(() => {
      this.sync()
    }, interval)

    logger.info(`自动同步已启动，间隔 ${settings.sync.webdav.syncInterval} 分钟`)
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      logger.info('自动同步已停止')
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.status }
  }

  /**
   * 更新同步配置
   */
  updateSyncConfig(): void {
    const settings = settingsManager.getAll()
    this.status.enabled = settings.sync.enabled

    if (settings.sync.enabled) {
      this.startAutoSync()
    } else {
      this.stopAutoSync()
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopAutoSync()
    this.db.close()
  }
}

export const syncManager = new SyncManager()
