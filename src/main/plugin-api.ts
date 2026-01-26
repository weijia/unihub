import { ipcMain, dialog, clipboard, shell, nativeImage, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { app } from 'electron'
import { permissionManager } from './permission-manager'
import { clipboardMonitor } from './clipboard-monitor'
import { lmdbManager } from './lmdb-manager'

/**
 * 插件 API 处理器
 * 提供文件系统、剪贴板、通知等能力
 */
export class PluginAPI {
  constructor() {
    this.registerHandlers()
  }

  // 执行系统命令，用于触发系统级粘贴
  private runSystemCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true })
      child.on('error', (error) => reject(error))
      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed: ${command} (exit ${code ?? 'unknown'})`))
        }
      })
    })
  }

  // 主进程小延迟，确保窗口状态更新后再发快捷键
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 根据平台发送粘贴快捷键，可选先切回上一个窗口
  private async sendSystemPaste(options: { switchToLastWindow?: boolean } = {}): Promise<void> {
    const switchToLastWindow = options.switchToLastWindow ?? false

    if (process.platform === 'win32') {
      // Windows 用 Alt+Tab 切回上一个窗口，再发送 Ctrl+V
      const command = switchToLastWindow
        ? "$ws = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 80; $ws.SendKeys('%{TAB}'); Start-Sleep -Milliseconds 120; $ws.SendKeys('^v')"
        : "$ws = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 80; $ws.SendKeys('^v')"

      await this.runSystemCommand('powershell', [
        '-NoProfile',
        '-Command',
        command
      ])
      return
    }

    if (process.platform === 'darwin') {
      const script = switchToLastWindow
        ? 'tell application \"System Events\" to keystroke tab using {command down}\n' +
          'delay 0.15\n' +
          'tell application \"System Events\" to keystroke \"v\" using {command down}'
        : 'tell application \"System Events\" to keystroke \"v\" using {command down}'

      await this.runSystemCommand('osascript', ['-e', script])
      return
    }

    if (switchToLastWindow) {
      await this.runSystemCommand('xdotool', ['key', 'Alt+Tab'])
      await this.wait(120)
    }
    await this.runSystemCommand('xdotool', ['key', '--clearmodifiers', 'ctrl+v'])
  }

  private registerHandlers(): void {
    // 文件系统 API
    ipcMain.handle('plugin-api:fs:readFile', async (event, path: string) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'fs')

        const content = await readFile(path, 'utf-8')
        return { success: true, data: content }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:writeFile', async (_, path: string, content: string) => {
      try {
        await writeFile(path, content, 'utf-8')
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:readDir', async (_, path: string) => {
      try {
        const files = await readdir(path)
        return { success: true, data: files }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:exists', async (_, path: string) => {
      return { success: true, data: existsSync(path) }
    })

    ipcMain.handle('plugin-api:fs:stat', async (_, path: string) => {
      try {
        const stats = await stat(path)
        return {
          success: true,
          data: {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtime: stats.mtime.toISOString()
          }
        }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:mkdir', async (_, path: string) => {
      try {
        await mkdir(path, { recursive: true })
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:selectFile', async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile']
        })
        return { success: true, data: result.filePaths[0] || null }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:fs:selectDirectory', async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory']
        })
        return { success: true, data: result.filePaths[0] || null }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    // 剪贴板 API
    ipcMain.handle('plugin-api:clipboard:readText', (event) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'clipboard')

        return { success: true, data: clipboard.readText() }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:clipboard:writeText', (event, text: string) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'clipboard')

        clipboard.writeText(text)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:clipboard:readImage', () => {
      const image = clipboard.readImage()
      if (image.isEmpty()) {
        return { success: true, data: null }
      }
      return { success: true, data: image.toDataURL() }
    })

    ipcMain.handle('plugin-api:clipboard:writeImage', (_, dataUrl: string) => {
      try {
        const image = nativeImage.createFromDataURL(dataUrl)
        clipboard.writeImage(image)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    // 剪贴板监控 API
    ipcMain.handle('plugin-api:clipboard:subscribe', (event) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'clipboard')

        const window = BrowserWindow.fromWebContents(event.sender)
        if (window) {
          clipboardMonitor.subscribe(window)
        }

        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:clipboard:unsubscribe', (event) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window) {
          clipboardMonitor.unsubscribe(window)
        }

        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    // 系统 API
    ipcMain.handle('plugin-api:system:getInfo', () => {
      return {
        success: true,
        data: {
          platform: process.platform,
          arch: process.arch,
          version: app.getVersion(),
          appPath: app.getAppPath(),
          userDataPath: app.getPath('userData'),
          tempPath: app.getPath('temp')
        }
      }
    })

    ipcMain.handle('plugin-api:system:openExternal', async (_, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:system:showInFolder', async (_, path: string) => {
      try {
        shell.showItemInFolder(path)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:system:paste', async (event) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'system')

        await this.sendSystemPaste()
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle(
      'plugin-api:system:quickPaste',
      async (event, options: { delayMs?: number; hideWindow?: boolean } = {}) => {
        try {
          const pluginId = this.getPluginIdFromEvent(event)
          permissionManager.requirePermission(pluginId, 'system')

          // 主进程统一控制隐藏与切窗，提升前台焦点稳定性
          const window = BrowserWindow.fromWebContents(event.sender)
          // 通过 URL 参数判断悬浮窗，默认不隐藏
          const isFloating = event.sender.getURL().includes('floating=1')
          const hideWindow = isFloating ? false : options.hideWindow ?? true
          if (window && !window.isDestroyed()) {
            if (hideWindow) {
              window.hide()
            }
          }

          const delayMs = Math.max(120, options.delayMs ?? 220)
          await this.wait(delayMs)

          await this.sendSystemPaste({ switchToLastWindow: true })

          // 悬浮窗模式不做额外显隐/置顶切换，避免闪烁
          return { success: true }
        } catch (error: unknown) {
          return { success: false, error: (error as Error).message }
        }
      }
    )

    // HTTP API（避免 CORS）
    ipcMain.handle('plugin-api:http:request', async (event, options: Record<string, unknown>) => {
      try {
        const pluginId = this.getPluginIdFromEvent(event)
        permissionManager.requirePermission(pluginId, 'http')

        const response = await fetch(options.url as string, {
          method: (options.method as string) || 'GET',
          headers: options.headers as Record<string, string>,
          body: options.body ? JSON.stringify(options.body) : undefined
        })

        // 检查是否是图片类型
        const contentType = response.headers.get('content-type') || ''
        const isImage = contentType.startsWith('image/')

        let data: string
        if (isImage) {
          // 对于图片，转换为 base64 data URL
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          data = `data:${contentType};base64,${base64}`
        } else {
          // 对于文本，直接返回
          data = await response.text()
        }

        return {
          success: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: data,
            isImage
          }
        }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    // 存储 API（使用 LMDB）
    ipcMain.handle('plugin-api:storage:get', async (_, pluginId: string, key: string) => {
      try {
        const data = lmdbManager.getPluginStorage(pluginId, key)
        return { success: true, data: data || null }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle(
      'plugin-api:storage:set',
      async (_, pluginId: string, key: string, value: unknown) => {
        try {
          lmdbManager.setPluginStorage(pluginId, key, value)
          return { success: true }
        } catch (error: unknown) {
          return { success: false, error: (error as Error).message }
        }
      }
    )

    ipcMain.handle('plugin-api:storage:delete', async (_, pluginId: string, key: string) => {
      try {
        lmdbManager.deletePluginStorage(pluginId, key)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:storage:allKeys', async (_, pluginId: string) => {
      try {
        const keys = lmdbManager.getPluginStorageKeys(pluginId)
        return { success: true, data: keys }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('plugin-api:storage:clear', async (_, pluginId: string) => {
      try {
        lmdbManager.clearPluginStorage(pluginId)
        return { success: true }
      } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
      }
    })

    // 通知 API
    ipcMain.handle(
      'plugin-api:notification:show',
      async (event, options: Record<string, unknown>) => {
        try {
          const pluginId = this.getPluginIdFromEvent(event)
          permissionManager.requirePermission(pluginId, 'notification')

          const { Notification } = await import('electron')
          new Notification({
            title: options.title as string,
            body: options.body as string,
            icon: options.icon as string
          }).show()
          return { success: true }
        } catch (error: unknown) {
          return { success: false, error: (error as Error).message }
        }
      }
    )
  }

  /**
   * 从 IPC 事件中获取插件 ID
   */
  private getPluginIdFromEvent(event: Electron.IpcMainInvokeEvent): string {
    // 从 sender 的 URL 中提取插件 ID
    const url = event.sender.getURL()
    const match = url.match(/[?&]__plugin_id=([^&]+)/)
    if (match) {
      return match[1]
    }

    // 如果无法获取，返回 unknown（内置插件）
    return 'builtin'
  }
}
