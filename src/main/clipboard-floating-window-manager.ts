import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { createLogger } from '../shared/logger'
import { lmdbManager } from './lmdb-manager'

const logger = createLogger('clipboard-floating-window')
const FLOATING_STORAGE_KEY = 'floating-items'

export class ClipboardFloatingWindowManager {
  private floatingWindow: BrowserWindow | null = null
  private pluginId: string | null = null
  private currentUrl: string | null = null

  openFloatingWindow(pluginId: string, url: string): void {
    this.pluginId = pluginId

    if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
      if (this.currentUrl !== url) {
        this.currentUrl = url
        this.floatingWindow.loadURL(url).catch((err) => {
          logger.error({ err }, 'Failed to reload floating clipboard window')
        })
      }
      this.showWindow()
      this.floatingWindow.webContents.send('clipboard-floating:items-updated')
      return
    }

    this.currentUrl = url

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // 将悬浮窗固定在右上区域，避免遮挡主窗口
    const windowWidth = 360
    const windowHeight = 560
    const x = Math.max(0, width - windowWidth - 24)
    const y = Math.max(0, Math.floor(height * 0.15))

    this.floatingWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 280,
      minHeight: 360,
      x,
      y,
      show: false,
      frame: false,
      transparent: false,
      resizable: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: true,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: process.env.NODE_ENV === 'development'
      }
    })

    this.floatingWindow.on('ready-to-show', () => {
      this.showWindow()
    })

    this.floatingWindow.on('closed', () => {
      this.clearFloatingItems()
      this.floatingWindow = null
      this.pluginId = null
      this.currentUrl = null
    })

    this.floatingWindow.webContents.once('dom-ready', () => {
      this.floatingWindow?.webContents.send('clipboard-floating:items-updated')
    })

    this.floatingWindow.loadURL(url).catch((err) => {
      logger.error({ err }, 'Failed to load floating clipboard window')
    })
  }

  closeFloatingWindow(): void {
    if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
      this.clearFloatingItems()
      this.floatingWindow.close()
      return
    }

    this.clearFloatingItems()
  }

  destroy(): void {
    if (this.floatingWindow && !this.floatingWindow.isDestroyed()) {
      this.floatingWindow.destroy()
    }
    this.floatingWindow = null
    this.pluginId = null
    this.currentUrl = null
  }

  private showWindow(): void {
    if (!this.floatingWindow || this.floatingWindow.isDestroyed()) return
    this.floatingWindow.show()
    this.floatingWindow.focus()
    this.floatingWindow.setAlwaysOnTop(true, 'floating')
  }

  private clearFloatingItems(): void {
    if (!this.pluginId) return
    try {
      lmdbManager.deletePluginStorage(this.pluginId, FLOATING_STORAGE_KEY)
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear floating clipboard items')
    }
  }
}

export const clipboardFloatingWindowManager = new ClipboardFloatingWindowManager()
