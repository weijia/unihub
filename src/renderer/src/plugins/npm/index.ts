import { reactive, ref } from 'vue'
import { pluginRegistry } from '../registry'
import { loadNpmPlugin, type NpmPluginInfo } from './loader'

interface SavedNpmPlugin {
  info: NpmPluginInfo
  pluginId: string
}

class NpmPluginManager {
  private savedPlugins = reactive<Map<string, SavedNpmPlugin>>(new Map())
  public loading = ref(false)

  constructor() {
    this.loadFromLocalStorage()
  }

  async installPlugin(info: NpmPluginInfo): Promise<void> {
    this.loading.value = true
    try {
      const plugin = await loadNpmPlugin(info)
      pluginRegistry.register(plugin)

      const saved: SavedNpmPlugin = {
        info,
        pluginId: plugin.metadata.id
      }
      this.savedPlugins.set(plugin.metadata.id, saved)
      this.saveToLocalStorage()
    } finally {
      this.loading.value = false
    }
  }

  uninstallPlugin(pluginId: string): void {
    pluginRegistry.unregister(pluginId)
    this.savedPlugins.delete(pluginId)
    this.saveToLocalStorage()
  }

  async loadSavedPlugins(): Promise<void> {
    const plugins = Array.from(this.savedPlugins.values())
    for (const saved of plugins) {
      try {
        const plugin = await loadNpmPlugin(saved.info)
        pluginRegistry.register(plugin)
      } catch (err) {
        console.error(`Failed to load saved npm plugin ${saved.pluginId}:`, err)
      }
    }
  }

  private saveToLocalStorage(): void {
    const data = Array.from(this.savedPlugins.values())
    localStorage.setItem('npm-plugins', JSON.stringify(data))
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('npm-plugins')
      if (saved) {
        const data = JSON.parse(saved) as SavedNpmPlugin[]
        data.forEach((item) => {
          this.savedPlugins.set(item.pluginId, item)
        })
      }
    } catch (err) {
      console.error('Failed to load npm plugins from localStorage:', err)
    }
  }

  getAllSavedPlugins(): SavedNpmPlugin[] {
    return Array.from(this.savedPlugins.values())
  }
}

export const npmPluginManager = new NpmPluginManager()
