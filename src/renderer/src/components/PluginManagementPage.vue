<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pluginRegistry } from '@/plugins'
import { pluginInstaller } from '@/plugins/marketplace/installer'
import { npmPluginManager } from '@/plugins/npm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PluginIcon } from '@/components/ui/plugin-icon'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import PluginDevMode from './PluginDevMode.vue'
import PluginStore from './PluginStore.vue'
import { CATEGORY_NAMES, MARKETPLACE_URL } from '@/constants'
import { isBrowser } from '@/utils/plugin-adapter'

type ActiveTab = 'store' | 'installed' | 'install'

const activeTab = ref<ActiveTab>('store')
const showDevMode = ref(false)
const installUrl = ref('')
const installing = ref(false)
const isDragging = ref(false)
const dragCounter = ref(0) // 用于跟踪拖拽进入/离开的次数

const fileInput = ref<HTMLInputElement>()
const showUninstallDialog = ref(false)
const pluginToUninstall = ref<{ id: string; name: string } | null>(null)
const refreshKey = ref(0)

// npm plugin install state
const npmPackageName = ref('')
const npmPackageVersion = ref('')
const npmCdn = ref<'esm.sh' | 'unpkg.com' | 'jsdelivr.net'>('esm.sh')
const installingNpm = ref(false)

// 事件处理器引用
let pluginEventHandler: (() => void) | null = null

// 内置插件（不包括第三方）
const builtInPlugins = computed(() => {
  void pluginRegistry.version.value
  void refreshKey.value
  return pluginRegistry.getAll().filter((p) => !p.metadata.isThirdParty)
})

// 第三方插件（从 registry 获取，确保状态同步）
const thirdPartyPlugins = computed(() => {
  void pluginRegistry.version.value
  void refreshKey.value
  return pluginRegistry.getAll().filter((p) => p.metadata.isThirdParty)
})

interface InstalledPlugin {
  id: string
  version: string
  source: string
  installedAt: string
  enabled: boolean
  metadata: {
    name: string
    description: string
  }
}

const installedPlugins = ref<InstalledPlugin[]>([])

// 插件更新信息
const pluginUpdates = ref<Map<string, { latestVersion: string; downloadUrl: string }>>(new Map())
const checkingUpdates = ref(false)
const updatingPlugins = ref<Set<string>>(new Set())

// 按分类分组（只包含内置插件）
const pluginsByCategory = computed(() => {
  const categories = new Map<string, typeof builtInPlugins.value>()
  void refreshKey.value

  for (const plugin of builtInPlugins.value) {
    const category = plugin.metadata.category
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(plugin)
  }

  return categories
})

const enabledCount = computed(() => builtInPlugins.value.filter((p) => p.enabled).length)

// 切换插件状态
const togglePlugin = (id: string): void => {
  pluginRegistry.toggle(id)
  refreshKey.value++
}

// 加载已安装的第三方插件
const loadInstalledPlugins = async (): Promise<void> => {
  try {
    const plugins = await window.api.plugin.list()
    installedPlugins.value = plugins as unknown as InstalledPlugin[]
  } catch (err) {
    console.error('加载已安装插件失败:', err)
  }
}

// 检查插件更新
const checkPluginUpdates = async (): Promise<void> => {
  try {
    checkingUpdates.value = true
    // 使用项目配置的市场 URL，失败时在后端自动降级到 CDN
    const result = await window.api.plugin.checkUpdates(MARKETPLACE_URL)

    if (result.success && result.updates) {
      pluginUpdates.value.clear()
      result.updates.forEach((update) => {
        pluginUpdates.value.set(update.id, {
          latestVersion: update.latestVersion,
          downloadUrl: update.downloadUrl || ''
        })
      })

      if (result.updates.length > 0) {
        toast.success(`发现 ${result.updates.length} 个插件有更新`)
      }
      // 移除"所有插件都是最新版本"的提示，静默处理
    } else {
      const errorMsg = result.message || '检查更新失败'
      console.error('检查更新失败:', errorMsg)
      toast.error(`检查更新失败: ${errorMsg}`)
    }
  } catch (err) {
    console.error('检查更新失败:', err)
    const errorMessage = err instanceof Error ? err.message : '网络连接失败'
    toast.error(`检查更新失败: ${errorMessage}`)
  } finally {
    checkingUpdates.value = false
  }
}

// 更新单个插件
const updatePlugin = async (pluginId: string, pluginName: string): Promise<void> => {
  const updateInfo = pluginUpdates.value.get(pluginId)
  if (!updateInfo || !updateInfo.downloadUrl) {
    toast.error('无法获取更新信息')
    return
  }

  try {
    updatingPlugins.value.add(pluginId)
    const result = await window.api.plugin.update(pluginId, updateInfo.downloadUrl)

    if (result.success) {
      toast.success(`${pluginName} 更新成功！`)
      pluginUpdates.value.delete(pluginId)
      await pluginInstaller.loadInstalledPlugins()
      await loadInstalledPlugins()
      refreshKey.value++
      window.dispatchEvent(new CustomEvent('plugin-installed'))
    } else {
      toast.error(result.message || '更新失败')
    }
  } catch (err) {
    console.error('更新插件失败:', err)
    toast.error(err instanceof Error ? err.message : '更新失败')
  } finally {
    updatingPlugins.value.delete(pluginId)
  }
}

// 检查插件是否有更新
const hasUpdate = (pluginId: string): boolean => {
  return pluginUpdates.value.has(pluginId)
}

// 获取插件的最新版本号
const getLatestVersion = (pluginId: string): string => {
  return pluginUpdates.value.get(pluginId)?.latestVersion || ''
}

onMounted(() => {
  loadInstalledPlugins()

  // 可选：自动检查更新（可以通过配置控制）
  // 延迟 1 秒后检查，避免影响页面加载速度
  setTimeout(() => {
    checkPluginUpdates()
  }, 1000)

  // 监听插件安装/卸载事件
  pluginEventHandler = () => {
    console.log('收到插件变更事件，刷新列表')
    loadInstalledPlugins()
    refreshKey.value++
  }

  window.addEventListener('plugin-installed', pluginEventHandler)
  window.addEventListener('plugin-uninstalled', pluginEventHandler)
})

onUnmounted(() => {
  // 清理事件监听
  if (pluginEventHandler) {
    window.removeEventListener('plugin-installed', pluginEventHandler)
    window.removeEventListener('plugin-uninstalled', pluginEventHandler)
  }
})

// 从 URL 安装
const installFromUrl = async (): Promise<void> => {
  if (!installUrl.value.trim()) {
    toast.error('请输入插件 URL')
    return
  }

  try {
    installing.value = true
    await pluginInstaller.installFromUrl(installUrl.value)
    toast.success('插件安装成功！')
    installUrl.value = ''
    // 先重新加载插件列表，再刷新注册表
    await pluginInstaller.loadInstalledPlugins()
    await loadInstalledPlugins()
    // 强制刷新视图
    refreshKey.value++
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('plugin-installed'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '安装失败')
  } finally {
    installing.value = false
  }
}

// 处理文件拖拽
const handleDragEnter = (event: DragEvent): void => {
  event.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent): void => {
  event.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

const handleDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault()
  dragCounter.value = 0
  isDragging.value = false

  const file = event.dataTransfer?.files?.[0]
  if (!file) {
    toast.error('请拖拽一个文件')
    return
  }

  await installFile(file)
}

// 触发文件选择
const triggerFileSelect = (): void => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    await installFile(file)
    target.value = '' // 清空，允许重复选择
  }
}

// 安装文件
const installFile = async (file: File): Promise<void> => {
  if (!file.name.endsWith('.zip')) {
    toast.error('只支持 .zip 格式的插件文件')
    return
  }

  try {
    installing.value = true
    await pluginInstaller.installFromFile(file)
    toast.success('插件安装成功！')
    // 先重新加载插件列表，再刷新注册表
    await pluginInstaller.loadInstalledPlugins()
    await loadInstalledPlugins()
    // 强制刷新视图
    refreshKey.value++
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('plugin-installed'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '安装失败')
  } finally {
    installing.value = false
  }
}

// 卸载插件 - 显示确认对话框
const confirmUninstall = (pluginId: string, pluginName: string): void => {
  pluginToUninstall.value = { id: pluginId, name: pluginName }
  showUninstallDialog.value = true
}

// 执行卸载
const uninstallPlugin = async (): Promise<void> => {
  if (!pluginToUninstall.value) return

  try {
    await pluginInstaller.uninstall(pluginToUninstall.value.id)
    toast.success('插件已卸载')
    await loadInstalledPlugins()
    // 强制刷新视图
    refreshKey.value++
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('plugin-uninstalled'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '卸载失败')
  } finally {
    showUninstallDialog.value = false
    pluginToUninstall.value = null
  }
}

// Install npm plugin
const installNpmPlugin = async (): Promise<void> => {
  if (!npmPackageName.value.trim()) {
    toast.error('请输入 npm 包名')
    return
  }

  installingNpm.value = true
  try {
    await npmPluginManager.installPlugin({
      packageName: npmPackageName.value.trim(),
      version: npmPackageVersion.value.trim() || undefined,
      cdn: npmCdn.value
    })
    toast.success('npm 插件安装成功！')
    npmPackageName.value = ''
    npmPackageVersion.value = ''
    refreshKey.value++
    window.dispatchEvent(new CustomEvent('plugin-installed'))
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'npm 插件安装失败')
  } finally {
    installingNpm.value = false
  }
}

// Uninstall npm plugin
const uninstallNpmPlugin = (pluginId: string, pluginName: string): void => {
  pluginToUninstall.value = { id: pluginId, name: pluginName }
  showUninstallDialog.value = true
}

const confirmUninstallNpm = async (): Promise<void> => {
  if (!pluginToUninstall.value) return
  try {
    npmPluginManager.uninstallPlugin(pluginToUninstall.value.id)
    toast.success('npm 插件已卸载')
    refreshKey.value++
    window.dispatchEvent(new CustomEvent('plugin-uninstalled'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '卸载失败')
  } finally {
    showUninstallDialog.value = false
    pluginToUninstall.value = null
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 标签页切换 -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          :class="[
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'store'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          @click="activeTab = 'store'"
        >
          插件市场
        </button>
        <button
          :class="[
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'installed'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          @click="activeTab = 'installed'"
        >
          已安装
        </button>
        <button
          :class="[
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'install'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          @click="activeTab = 'install'"
        >
          手动安装
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="checkingUpdates" @click="checkPluginUpdates">
          {{ checkingUpdates ? '检查中...' : '检查更新' }}
        </Button>
        <Button variant="outline" size="sm" @click="showDevMode = true"> 开发模式 </Button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <!-- 已安装插件标签页 -->
      <div v-show="activeTab === 'installed'" class="space-y-4 p-4">
        <!-- 第三方插件 -->
        <div v-if="thirdPartyPlugins.length > 0">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            第三方插件
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              {{ thirdPartyPlugins.length }} 个已安装
            </span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="plugin in thirdPartyPlugins"
              :key="plugin.metadata.id"
              class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <!-- 图标 -->
              <PluginIcon :icon="plugin.metadata.icon" size="sm" class="flex-shrink-0" />

              <!-- 信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ plugin.metadata.name }}
                  </h4>
                  <Badge variant="secondary" class="text-xs px-1.5 py-0.5">
                    v{{ plugin.metadata.version }}
                  </Badge>
                  <Badge
                    v-if="hasUpdate(plugin.metadata.id)"
                    variant="default"
                    class="text-xs px-1.5 py-0.5 bg-blue-500 hover:bg-blue-600"
                  >
                    v{{ getLatestVersion(plugin.metadata.id) }} 可用
                  </Badge>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {{ plugin.metadata.description }}
                </p>
              </div>

              <!-- 操作按钮 -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <Button
                  v-if="hasUpdate(plugin.metadata.id)"
                  size="sm"
                  variant="default"
                  class="text-xs px-2 py-1 h-auto bg-blue-500 hover:bg-blue-600"
                  :disabled="updatingPlugins.has(plugin.metadata.id)"
                  @click="updatePlugin(plugin.metadata.id, plugin.metadata.name)"
                >
                  {{ updatingPlugins.has(plugin.metadata.id) ? '更新中...' : '更新' }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs px-2 py-1 h-auto"
                  @click="confirmUninstall(plugin.metadata.id, plugin.metadata.name)"
                >
                  卸载
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- 内置插件 -->
        <div
          :class="{
            'pt-4 border-t border-gray-200 dark:border-gray-700': thirdPartyPlugins.length > 0
          }"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            内置插件
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              已启用 {{ enabledCount }} / {{ builtInPlugins.length }} 个
            </span>
          </h2>

          <div class="space-y-3">
            <div v-for="[category, plugins] in pluginsByCategory" :key="category">
              <h3
                class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
              >
                <div class="w-1 h-3 bg-blue-500 rounded-full"></div>
                {{ CATEGORY_NAMES[category] || category }}
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div
                  v-for="plugin in plugins"
                  :key="plugin.metadata.id"
                  class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <!-- 图标 -->
                  <div
                    class="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <svg
                      class="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="plugin.metadata.icon"
                      />
                    </svg>
                  </div>

                  <!-- 信息 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ plugin.metadata.name }}
                      </h4>
                      <Badge variant="secondary" class="text-xs px-1.5 py-0.5">
                        v{{ plugin.metadata.version }}
                      </Badge>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {{ plugin.metadata.description }}
                    </p>
                  </div>

                  <!-- 开关 -->
                  <Switch
                    :checked="plugin.enabled"
                    class="flex-shrink-0"
                    @update:checked="togglePlugin(plugin.metadata.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 插件市场标签页 -->
      <div v-show="activeTab === 'store'" class="h-full">
        <PluginStore />
      </div>

      <!-- 手动安装标签页 -->
      <div v-show="activeTab === 'install'" class="space-y-3 p-4">
        <!-- 从 npm 安装（仅浏览器模式） -->
        <div
          v-if="isBrowser"
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            从 npm 安装插件
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            输入 npm 包名安装 ESM 格式的 UniHub 插件
          </p>
          <div class="space-y-3">
            <div class="flex gap-3">
              <Input
                v-model="npmPackageName"
                placeholder="npm 包名，例如 unihub-plugin-demo"
                class="flex-1"
                :disabled="installingNpm"
              />
              <Input
                v-model="npmPackageVersion"
                placeholder="版本（可选）"
                class="w-32"
                :disabled="installingNpm"
              />
            </div>
            <div class="flex gap-3">
              <Select v-model="npmCdn" :disabled="installingNpm">
                <SelectTrigger class="w-40">
                  <SelectValue placeholder="选择 CDN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="esm.sh">esm.sh</SelectItem>
                  <SelectItem value="unpkg.com">unpkg.com</SelectItem>
                  <SelectItem value="jsdelivr.net">jsdelivr.net</SelectItem>
                </SelectContent>
              </Select>
              <Button :disabled="installingNpm || !npmPackageName.trim()" @click="installNpmPlugin">
                {{ installingNpm ? '安装中...' : '从 npm 安装' }}
              </Button>
            </div>
          </div>
        </div>

        <!-- 从 URL / ZIP 安装 -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">手动安装插件</h3>

          <!-- 拖拽区域 -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg p-6 mb-3 text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]"
            @drop="handleDrop"
            @dragover.prevent
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @click="triggerFileSelect"
          >
            <svg
              class="w-10 h-10 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p class="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
              拖拽 ZIP 文件到这里
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">或者点击选择文件</p>
            <Button variant="outline" size="sm" type="button" @click.stop> 选择文件 </Button>
          </div>

          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInput"
            type="file"
            accept=".zip"
            class="hidden"
            @change="handleFileSelect"
          />

          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            支持三种安装方式：拖拽文件、点击选择文件，或输入 URL
          </p>

          <div class="flex gap-3">
            <Input
              v-model="installUrl"
              placeholder="http://localhost:8080/plugin.zip 或 file:///path/to/plugin.zip"
              class="flex-1"
              :disabled="installing"
            />
            <Button :disabled="installing || !installUrl.trim()" @click="installFromUrl">
              {{ installing ? '安装中...' : '从 URL 安装' }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 开发模式对话框 -->
    <PluginDevMode v-if="showDevMode" @close="showDevMode = false" />

    <!-- 卸载确认对话框 -->
    <Dialog :open="showUninstallDialog" @update:open="showUninstallDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认卸载插件</DialogTitle>
          <DialogDescription>
            确定要卸载插件 "{{ pluginToUninstall?.name }}" 吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" @click="showUninstallDialog = false">取消</Button>
          <Button
            variant="destructive"
            @click="isBrowser ? confirmUninstallNpm() : uninstallPlugin()"
            >确认卸载</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
