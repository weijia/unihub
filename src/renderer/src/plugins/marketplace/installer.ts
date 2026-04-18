import { pluginRegistry } from '../registry'
import { Component, h } from 'vue'

/**
 * 插件安装器
 * 使用 iframe 加载插件
 */
export class PluginInstaller {
  /**
   * 智能安装 - 根据输入自动判断安装方式
   */
  async install(input: string): Promise<void> {
    try {
      // 判断安装方式
      if (input.startsWith('@') || input.includes('/')) {
        // npm 包格式: @unihub/plugin-name 或 unihub-plugin-name
        return await this.installFromNpm(input)
      } else if (input.startsWith('http')) {
        // URL 格式
        return await this.installFromUrl(input)
      } else if (input.includes(':')) {
        // GitHub 格式: owner/repo
        return await this.installFromGitHub(input)
      } else {
        throw new Error('无法识别的安装格式')
      }
    } catch (error) {
      console.error('安装插件失败:', error)
      throw error
    }
  }

  /**
   * 从 URL 安装插件
   */
  async installFromUrl(url: string): Promise<void> {
    try {
      if (url.startsWith('http') && !url.endsWith('.zip')) {
        throw new Error('仅支持 .zip 格式的插件包')
      }

      console.log('📦 [Installer] 开始安装插件:', url)
      const result = await window.api.plugin.install(url)

      if (!result.success) {
        throw new Error(result.message)
      }

      console.log('✅ [Installer] 插件安装成功')
      console.log('📊 [Installer] 插件信息:', result)

      // 记录下载（异步，不阻塞）
      if (result.pluginId) {
        console.log('📊 [Installer] 准备记录下载，pluginId:', result.pluginId)
        const { pluginStatsService } = await import('./stats')
        pluginStatsService.trackDownload(result.pluginId).catch((err) => {
          console.warn('🔴 [Installer] 记录下载失败:', err)
        })
      } else {
        console.warn('⚠️ [Installer] 没有 pluginId，无法记录下载')
      }
    } catch (error) {
      console.error('❌ [Installer] 安装插件失败:', error)
      throw error
    }
  }

  /**
   * 从 npm 安装插件
   */
  async installFromNpm(packageName: string): Promise<void> {
    try {
      console.log('从 npm 安装插件:', packageName)
      // TODO: 实现 npm 安装逻辑
      throw new Error('npm 安装功能暂未实现')
    } catch (error) {
      console.error('从 npm 安装插件失败:', error)
      throw error
    }
  }

  /**
   * 从 GitHub 安装插件
   */
  async installFromGitHub(repo: string): Promise<void> {
    try {
      console.log('从 GitHub 安装插件:', repo)

      // 转换为 GitHub Release URL
      // 格式: owner/repo -> https://github.com/owner/repo/releases/latest/download/plugin.zip
      const url = `https://github.com/${repo}/releases/latest/download/plugin.zip`

      return await this.installFromUrl(url)
    } catch (error) {
      console.error('从 GitHub 安装插件失败:', error)
      throw error
    }
  }

  /**
   * 从文件安装插件
   */
  async installFromFile(file: File): Promise<void> {
    try {
      if (!file.name.endsWith('.zip')) {
        throw new Error('仅支持 .zip 格式的插件包')
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const result = await window.api.plugin.installFromBuffer(Array.from(buffer), file.name)

      if (!result.success) {
        throw new Error(result.message)
      }

      console.log('✅ 插件安装成功')
    } catch (error) {
      console.error('安装插件失败:', error)
      throw error
    }
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string): Promise<void> {
    try {
      pluginRegistry.unregister(pluginId)

      const result = await window.api.plugin.uninstall(pluginId)

      if (!result.success) {
        throw new Error(result.message)
      }

      // 清理该插件相关的缓存（如果有的话）
      // 注意：这里不清理所有缓存，只是标记需要重新加载
      // 实际上 Electron 的 WebContentsView 在关闭时会自动清理

      console.log('✅ 插件已卸载:', pluginId)
    } catch (error) {
      console.error('卸载插件失败:', error)
      throw error
    }
  }

  /**
   * 加载已安装的插件（性能优化版本）
   */
  async loadInstalledPlugins(): Promise<void> {
    try {
      const plugins = await window.api.plugin.list()

      // 先移除所有第三方插件（避免重复）
      const allPlugins = pluginRegistry.getAll()
      allPlugins.forEach((plugin) => {
        if (plugin.metadata.isThirdParty) {
          pluginRegistry.unregister(plugin.metadata.id)
        }
      })

      // 批量注册插件，减少 DOM 更新
      const pluginsToRegister: Array<{
        metadata: {
          id: string
          name: string
          description: string
          version: string
          author: string
          icon: string
          category: 'formatter' | 'tool' | 'encoder' | 'custom'
          keywords: string[]
          isThirdParty: boolean
        }
        component: Component
        enabled: boolean
        hasBackend: boolean
      }> = []

      for (const pluginInfo of plugins) {
        if (!pluginInfo.enabled) continue

        const metadata = pluginInfo.metadata as Record<string, unknown>
        const author = metadata.author as Record<string, unknown> | string
        const authorName =
          typeof author === 'string' ? author : (author?.name as string) || 'Unknown'
        const category = metadata.category as string
        const validCategory: 'formatter' | 'tool' | 'encoder' | 'custom' =
          category === 'formatter' || category === 'tool' || category === 'encoder'
            ? category
            : 'custom'

        // 创建插件组件（统一使用 iframe 渲染，兼容所有环境）
        let component: Component

        console.log('🔧 [Installer] 创建插件组件:', metadata.name as string)

        // 检查入口文件类型
        const entryType = (pluginInfo as any).entryType || 'html'
        const entryContent = (pluginInfo as any).entryContent
        console.log('🔧 [Installer] 入口文件类型:', entryType)

        if (entryType === 'html' && entryContent) {
          // HTML 入口文件：使用 iframe 渲染
          console.log('🔧 [Installer] 使用 HTML 入口文件渲染')
          console.log('🔧 [Installer] HTML 内容长度:', entryContent.length)
          console.log('🔧 [Installer] 插件 ID:', metadata.id)
          console.log('🔧 [Installer] 插件名称:', metadata.name)
          component = {
            render() {
              return h('div', {
                class: 'w-full h-full plugin-html-container',
                'data-plugin-id': this.pluginId
              }, [
                h('iframe', {
                  srcdoc: this.htmlContent,
                  class: 'w-full h-full border-0',
                  sandbox: 'allow-scripts allow-same-origin',
                  onLoad: this.onIframeLoad,
                  onError: this.onIframeError,
                  onLoadstart: this.onIframeLoadStart,
                  onLoadend: this.onIframeLoadEnd
                })
              ])
            },
            data() {
              return {
                pluginName: metadata.name as string,
                pluginId: metadata.id as string,
                pluginVersion: metadata.version as string,
                htmlContent: entryContent as string,
                iframeLoading: false,
                iframeError: null
              }
            },
            mounted() {
              console.log('🔧 [Installer] iframe 组件已挂载:', this.pluginId)
              console.log(
                '🔧 [Installer] iframe 内容预览:',
                this.htmlContent.substring(0, 100) + (this.htmlContent.length > 100 ? '...' : '')
              )
              console.log('🔧 [Installer] 组件状态:', {
                pluginId: this.pluginId,
                htmlContentLength: this.htmlContent.length,
                $el: this.$el,
                $elExists: !!this.$el,
                isInDOM: document.contains(this.$el)
              })
              // 延迟检查 DOM，确保渲染完成
              setTimeout(() => {
                console.log('🔧 [Installer] 延迟检查 DOM 结构')
                console.log('🔧 [Installer] this.$el:', this.$el)
                console.log('🔧 [Installer] this.$el 类型:', typeof this.$el)
                console.log('🔧 [Installer] this.$el 构造函数:', this.$el?.constructor?.name)
                
                // 安全检查 this.$el
                if (this.$el && typeof this.$el.querySelector === 'function') {
                  console.log('🔧 [Installer] 组件根元素存在且有 querySelector 方法')
                  const iframe = this.$el.querySelector('iframe')
                  console.log('🔧 [Installer] 直接查找 iframe:', iframe)
                  if (iframe) {
                    console.log('🔧 [Installer] iframe srcdoc:', (iframe as HTMLIFrameElement).srcdoc ? '已设置' : '未设置')
                  }
                } else {
                  console.warn('🔧 [Installer] this.$el 不是有效的 DOM 元素:', this.$el)
                }
                
                // 同时也通过选择器检查
                try {
                  const container = document.querySelector(
                    `.plugin-html-container[data-plugin-id="${this.pluginId}"]`
                  )
                  console.log('🔧 [Installer] 容器元素 (通过选择器):', container)
                  if (container) {
                    console.log('🔧 [Installer] 容器内容:', container.innerHTML)
                    const iframe = container.querySelector('iframe')
                    console.log('🔧 [Installer] 从容器查找 iframe:', iframe)
                    if (iframe) {
                      console.log('🔧 [Installer] iframe srcdoc:', (iframe as HTMLIFrameElement).srcdoc ? '已设置' : '未设置')
                    }
                  }
                } catch (error) {
                  console.error('🔧 [Installer] 选择器检查失败:', error)
                }
              }, 100)
            },
            methods: {
              onIframeLoadStart() {
                console.log('🔧 [Installer] iframe 开始加载:', this.pluginId)
                this.iframeLoading = true
              },
              onIframeLoad() {
                console.log('🔧 [Installer] HTML 插件 iframe 加载完成:', this.pluginId)
                this.iframeLoading = false
                // 获取 iframe 内容信息
                try {
                  const iframe = document.querySelector(
                    `.plugin-html-container[data-plugin-id="${this.pluginId}"] iframe`
                  ) as HTMLIFrameElement
                  if (iframe && iframe.contentDocument) {
                    const title = iframe.contentDocument.title || '无标题'
                    const headings = iframe.contentDocument.querySelectorAll('h1, h2, h3').length
                    console.log('🔧 [Installer] iframe 内容信息:', {
                      pluginId: this.pluginId,
                      title,
                      headingsCount: headings,
                      url: iframe.srcdoc ? 'srcdoc' : iframe.src
                    })
                  }
                } catch (error) {
                  console.warn('🔧 [Installer] 获取 iframe 内容信息失败:', error)
                }
              },
              onIframeLoadEnd() {
                console.log('🔧 [Installer] iframe 加载结束:', this.pluginId)
                this.iframeLoading = false
              },
              onIframeError(event: Event) {
                console.error('🔧 [Installer] iframe 加载错误:', this.pluginId, event)
                this.iframeError = event
                this.iframeLoading = false
              }
            }
          }
        } else if (typeof entryContent === 'string' && entryType === 'js') {
          // JavaScript 入口文件：尝试执行 JS 代码
          console.log('🔧 [Installer] 使用 JavaScript 入口文件')
          try {
            // 解析入口文件内容，提取插件对象
            const module = { exports: {} } as { exports: any }
            const require = (name: string) => {
              if (name === 'vue') {
                if ((window as any).Vue) {
                  return (window as any).Vue
                } else {
                  throw new Error('Vue is not available in global scope')
                }
              }
              throw new Error(`Module ${name} not found`)
            }

            const executeCode = new Function(
              'module',
              'exports',
              'require',
              'window',
              entryContent
            )
            executeCode(module, module.exports, require, window)

            const plugin = module.exports.default || module.exports

            if (plugin && plugin.component) {
              console.log('🔧 [Installer] 成功从入口文件提取插件组件')
              component = plugin.component
            } else {
              console.warn('🔧 [Installer] 从入口文件提取插件组件失败，使用默认组件')
              component = {
                render() {
                  return h('div', {
                    class: 'w-full h-full flex flex-col bg-white dark:bg-gray-900 p-4',
                    style: 'min-height: 300px;'
                  }, [
                    h('h2', {
                      class: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'
                    }, `插件名称: ${this.pluginName}`),
                    h('div', {
                      class: 'flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4',
                      style: 'min-height: 200px;'
                    }, [
                      h('p', {
                        class: 'text-gray-600 dark:text-gray-400'
                      }, '这是浏览器环境下的插件内容'),
                      h('p', {
                        class: 'text-gray-600 dark:text-gray-400 mt-2'
                      }, `插件 ID: ${this.pluginId}`),
                      h('p', {
                        class: 'text-gray-600 dark:text-gray-400 mt-2'
                      }, `插件版本: ${this.pluginVersion}`)
                    ])
                  ])
                },
                data() {
                  return {
                    pluginName: metadata.name as string,
                    pluginId: metadata.id as string,
                    pluginVersion: metadata.version as string
                  }
                }
              }
            }
          } catch (error) {
            console.error('🔧 [Installer] 执行插件入口文件失败:', error)
            component = {
              render() {
                return h('div', {
                  class: 'w-full h-full flex flex-col bg-white dark:bg-gray-900 p-4',
                  style: 'min-height: 300px;'
                }, [
                  h('h2', {
                    class: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'
                  }, `插件名称: ${this.pluginName}`),
                  h('div', {
                    class: 'flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4',
                    style: 'min-height: 200px;'
                  }, [
                    h('p', {
                      class: 'text-gray-600 dark:text-gray-400'
                    }, `加载失败: ${this.errorMessage}`)
                  ])
                ])
              },
              data() {
                return {
                  pluginName: metadata.name as string,
                  pluginId: metadata.id as string,
                  errorMessage: error instanceof Error ? error.message : String(error)
                }
              }
            }
          }
        } else {
          // 没有入口文件内容，使用默认组件
          console.warn('🔧 [Installer] 插件入口文件内容不存在，使用默认组件')
          component = {
            render() {
              return h('div', {
                class: 'w-full h-full flex flex-col bg-white dark:bg-gray-900 p-4',
                style: 'min-height: 300px;'
              }, [
                h('h2', {
                  class: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'
                }, `插件名称: ${this.pluginName}`),
                h('div', {
                  class: 'flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4',
                  style: 'min-height: 200px;'
                }, [
                  h('p', {
                    class: 'text-gray-600 dark:text-gray-400'
                  }, '插件内容加载中...'),
                  h('p', {
                    class: 'text-gray-600 dark:text-gray-400 mt-2'
                  }, `插件 ID: ${this.pluginId}`)
                ])
              ])
            },
            data() {
              return {
                pluginName: metadata.name as string,
                pluginId: metadata.id as string
              }
            }
          }
        }

        console.log('🔧 [Installer] 插件组件创建完成:', metadata.name as string)
        console.log('🔧 [Installer] 插件组件类型:', typeof component)

        const plugin = {
          metadata: {
            id: metadata.id as string,
            name: metadata.name as string,
            description: metadata.description as string,
            version: metadata.version as string,
            author: authorName,
            icon: (metadata.icon as string) || 'M12 4v16m8-8H4',
            category: validCategory,
            keywords: (metadata.keywords as string[]) || [],
            isThirdParty: true // 标记为第三方插件
          },
          component: component,
          enabled: true,
          hasBackend: (metadata.permissions as string[])?.includes('backend') || false
        }

        pluginsToRegister.push(plugin)
        console.log('🔧 [Installer] 插件添加到注册列表:', plugin.metadata.name)
      }

      console.log('🔧 [Installer] 准备批量注册插件，数量:', pluginsToRegister.length)
      // 批量注册（减少响应式更新）
      pluginsToRegister.forEach((plugin) => {
        console.log('🔧 [Installer] 注册插件:', plugin.metadata.name, plugin.metadata.id)
        pluginRegistry.register(plugin)
        console.log('✅ 已加载插件:', plugin.metadata.name)
      })
      console.log('🔧 [Installer] 插件注册完成')
    } catch (error) {
      console.error('加载插件列表失败:', error)
    }
  }
}

export const pluginInstaller = new PluginInstaller()
