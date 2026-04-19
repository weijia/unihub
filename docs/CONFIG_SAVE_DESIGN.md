# 配置保存设计文档

## 1. 设计概述

本设计文档描述了 UniHub 应用中配置保存的实现方案，包括配置的存储方式、管理机制、数据结构和通信流程。

### 1.1 设计目标

- **持久化存储**：确保用户配置在应用重启后依然保持
- **类型安全**：提供类型检查，减少配置错误
- **跨环境支持**：在主进程和渲染进程中都能使用
- **插件支持**：允许插件存储和管理自身配置
- **实时同步**：配置变更后实时生效

## 2. 配置存储架构

### 2.1 存储层次

UniHub 采用分层存储架构，根据不同场景使用不同的存储介质：

| 存储层     | 存储介质     | 适用场景               | 路径/键名                           |
| ---------- | ------------ | ---------------------- | ----------------------------------- |
| 主进程配置 | JSON 文件    | 全局应用设置           | `userData/config/settings.json`     |
| 前端配置   | localStorage | 前端状态持久化         | `localStorage` 键值对               |
| 插件配置   | localStorage | 插件数据存储           | `unihub_storage_${pluginId}_${key}` |
| 浏览器环境 | localStorage | 插件在浏览器环境中运行 | `unihub_settings` 等                |

### 2.2 核心组件

1. **SettingsManager**：主进程配置管理器
2. **useLocalStorage**：前端 localStorage 操作封装
3. **Browser Polyfill**：浏览器环境存储模拟
4. **IPC 接口**：主进程与渲染进程配置通信

## 3. 配置数据结构

### 3.1 应用设置结构

```typescript
interface AppSettings {
  // 快捷键设置
  shortcuts: {
    toggleWindow: string // 显示/隐藏窗口
    globalSearch: string // 全局搜索
  }
  // 插件快捷键设置
  pluginShortcuts: Array<{
    pluginId: string
    shortcut: string
  }>
  // 通用设置
  general: {
    launchAtStartup: boolean
    minimizeToTray: boolean
    language: string
  }
  // 外观设置
  appearance: {
    theme: 'light' | 'dark' | 'system'
    sidebarWidth: number
  }
  // WebDAV 同步设置
  sync: {
    enabled: boolean
    webdav: {
      url: string
      username: string
      password: string
      syncInterval: number // 同步间隔（分钟）
    }
  }
}
```

### 3.2 默认配置

应用启动时使用的默认配置：

```typescript
const defaultSettings: AppSettings = {
  shortcuts: {
    toggleWindow: process.platform === 'darwin' ? 'Command+Shift+Space' : 'Ctrl+Shift+Space',
    globalSearch: process.platform === 'darwin' ? 'Command+K' : 'Ctrl+K'
  },
  pluginShortcuts: [],
  general: {
    launchAtStartup: false,
    minimizeToTray: true,
    language: 'zh-CN'
  },
  appearance: {
    theme: 'system',
    sidebarWidth: 208
  }
}
```

## 4. 配置管理实现

### 4.1 主进程配置管理

#### 4.1.1 SettingsManager 类

**核心功能**：

- 配置文件的加载与保存
- 配置的合并与验证
- 配置的增删改查操作
- 批量更新支持
- 重置为默认值

**关键方法**：

- `loadSettings()`：加载配置文件
- `saveSettings()`：保存配置到文件
- `mergeSettings()`：深度合并配置
- `getAll()`：获取所有配置
- `update()`：批量更新配置
- `resetToDefaults()`：重置为默认配置

**文件路径**：`src/main/settings-manager.ts`

### 4.2 前端配置管理

#### 4.2.1 useLocalStorage 组合式函数

**核心功能**：

- 类型安全的 localStorage 操作
- 自动监听变化并同步到存储
- 支持深度监听对象变化
- 提供不同类型的便捷方法

**使用方式**：

```typescript
// 存储对象
const userPreferences = useLocalStorage('userPreferences', { theme: 'dark', fontSize: 14 })

// 存储字符串
const lastOpenedFile = useLocalStorageString('lastOpenedFile', '')

// 存储布尔值
const isFirstRun = useLocalStorageBoolean('isFirstRun', true)
```

**文件路径**：`src/renderer/src/composables/useLocalStorage.ts`

### 4.3 浏览器环境配置管理

#### 4.3.1 Browser Polyfill

**核心功能**：

- 模拟主进程存储接口
- 提供插件存储能力
- 在浏览器环境中持久化配置

**存储结构**：

- 应用设置：`unihub_settings`
- 插件存储：`unihub_storage_${pluginId}_${key}`
- 侧边栏状态：`unihub_sidebar_collapsed`

**文件路径**：`src/renderer/src/utils/browser-polyfill.ts`

## 5. 配置通信机制

### 5.1 IPC 接口

主进程通过 IPC 暴露以下配置管理接口：

| 接口名称                        | 功能描述       | 参数                            | 返回值                                   |
| ------------------------------- | -------------- | ------------------------------- | ---------------------------------------- |
| `settings:getAll`               | 获取所有配置   | 无                              | `AppSettings`                            |
| `settings:getShortcuts`         | 获取快捷键设置 | 无                              | `AppSettings['shortcuts']`               |
| `settings:setShortcut`          | 设置系统快捷键 | key: string, value: string      | `{ success: boolean }`                   |
| `settings:setPluginShortcut`    | 设置插件快捷键 | pluginId: string, value: string | `{ success: boolean, message?: string }` |
| `settings:removePluginShortcut` | 移除插件快捷键 | pluginId: string                | `{ success: boolean }`                   |
| `settings:update`               | 批量更新配置   | partial: Partial<AppSettings>   | `{ success: boolean }`                   |
| `settings:reset`                | 重置为默认配置 | 无                              | `{ success: boolean }`                   |

**文件路径**：`src/main/index.ts` (552-672行)

### 5.2 配置变更流程

1. **用户操作**：用户在设置界面修改配置
2. **前端调用**：前端通过 IPC 向主进程发送配置更新请求
3. **主进程处理**：主进程更新内存中的配置并保存到文件
4. **副作用处理**：根据配置变更执行相应操作（如快捷键注册）
5. **状态同步**：配置变更实时生效

## 6. 配置加载流程

1. **应用启动**：主进程初始化 SettingsManager
2. **配置文件检查**：检查用户数据目录中是否存在配置文件
3. **配置加载**：
   - 存在配置文件：读取并合并默认配置
   - 不存在配置文件：使用默认配置
4. **配置应用**：应用配置到各个模块（如快捷键注册）
5. **渲染进程初始化**：渲染进程通过 IPC 获取配置

## 7. 插件配置管理

### 7.1 插件存储接口

插件可以通过以下方式存储配置：

**主进程环境**：

- 使用 `pluginManager` 提供的存储接口
- 存储在插件专用目录

**浏览器环境**：

- 使用 `browser-polyfill` 提供的存储接口
- 存储在 localStorage 中，键名为 `unihub_storage_${pluginId}_${key}`

### 7.2 插件快捷键管理

插件可以注册全局快捷键，通过以下流程：

1. 插件调用 `settings:setPluginShortcut` IPC 接口
2. 主进程验证插件是否存在且启用
3. 注册快捷键并保存配置
4. 快捷键触发时调用插件相应功能

## 8. 安全性考虑

1. **配置文件权限**：确保配置文件只有应用可访问
2. **数据验证**：对用户输入的配置进行验证
3. **错误处理**：配置读写失败时提供合理的错误处理
4. **默认值保障**：确保配置缺失时使用安全的默认值

## 9. 性能优化

1. **内存缓存**：配置加载后缓存在内存中，避免频繁读写文件
2. **批量更新**：支持批量更新配置，减少文件写入次数
3. **防抖处理**：前端 localStorage 操作使用深度监听，避免频繁写入
4. **按需加载**：配置按需获取，减少不必要的数据传输

## 10. 扩展性考虑

1. **配置结构扩展**：支持新增配置项，通过合并默认值确保向后兼容
2. **存储介质扩展**：可根据需要添加其他存储介质（如数据库）
3. **插件配置隔离**：插件配置与应用配置分离，避免冲突
4. **多环境支持**：同一套配置管理方案支持主进程、渲染进程和浏览器环境

## 11. 代码结构

```
src/
├── main/
│   ├── settings-manager.ts     # 主进程配置管理器
│   ├── sync-manager.ts         # 配置同步管理器
│   └── index.ts                # IPC 接口实现
└── renderer/
    ├── src/
    │   ├── composables/
    │   │   └── useLocalStorage.ts  # 前端 localStorage 操作
    │   └── utils/
    │       └── browser-polyfill.ts  # 浏览器环境存储模拟
    └── src/components/
        └── settings/           # 设置界面组件
```

## 12. 配置同步功能

### 12.1 同步架构

UniHub 支持通过 WebDAV 实现配置的跨设备同步，使用以下技术栈：

- **存储引擎**：PouchDB（本地存储）
- **同步库**：universal-sync-v2（同步逻辑）
- **WebDAV 客户端**：zen-fs-webdav（远程存储连接）

### 12.2 同步流程

1. **初始化**：应用启动时初始化 SyncManager，从 PouchDB 加载设置
2. **同步执行**：
   - 从 WebDAV 同步数据到 PouchDB
   - 从 PouchDB 加载最新设置到内存
   - 将本地设置存储到 PouchDB
   - 再次同步到 WebDAV，确保所有更改都已上传
3. **冲突解决**：使用时间戳进行冲突解决，时间戳较新的配置优先
4. **自动同步**：根据配置的时间间隔（默认5分钟）自动执行同步

### 12.3 同步配置

```typescript
interface SyncConfig {
  enabled: boolean
  webdav: {
    url: string
    username: string
    password: string
    syncInterval: number // 同步间隔（分钟）
  }
}
```

### 12.4 同步状态

同步过程中维护以下状态：

```typescript
interface SyncStatus {
  enabled: boolean
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  error?: string
}
```

### 12.5 核心方法

| 方法名 | 功能描述 | 参数 | 返回值 |
|--------|----------|------|--------|
| `init()` | 初始化同步管理器 | 无 | `Promise<void>` |
| `sync()` | 执行同步操作 | 无 | `Promise<{ success: boolean; message?: string }>` |
| `startAutoSync()` | 启动自动同步 | 无 | `void` |
| `stopAutoSync()` | 停止自动同步 | 无 | `void` |
| `getSyncStatus()` | 获取同步状态 | 无 | `SyncStatus` |
| `updateSyncConfig()` | 更新同步配置 | 无 | `void` |
| `cleanup()` | 清理资源 | 无 | `void` |

### 12.6 配置存储结构

配置在 PouchDB 中按类别存储，每个类别对应一个文档：

| 文档 ID | 存储内容 |
|---------|----------|
| `settings:shortcuts` | 快捷键设置 |
| `settings:pluginShortcuts` | 插件快捷键设置 |
| `settings:general` | 通用设置 |
| `settings:appearance` | 外观设置 |
| `settings:sync` | 同步设置 |

每个文档包含以下结构：

```typescript
{
  _id: string,         // 文档ID
  data: any,           // 配置数据
  updatedAt: string     // 更新时间戳
}
```

### 12.7 WebDAV 适配器

为了与 universal-sync-v2 库兼容，实现了 WebDAV 文件系统适配器，提供以下接口：

- `access()`：检查文件是否存在
- `writeFile()`：写入文件
- `readFile()`：读取文件
- `mkdir()`：创建目录
- `readdir()`：读取目录内容
- `unlink()`：删除文件
- `rm()`：删除目录
- `stat()`：获取文件状态
- `rename()`：重命名文件
- `exists()`：检查路径是否存在

### 12.8 集成与通信

#### 12.8.1 主进程集成

- 应用启动时初始化 SyncManager：`await syncManager.init()`
- 应用退出前清理资源：`syncManager.cleanup()`
- 配置更新时更新同步配置：`syncManager.updateSyncConfig()`

#### 12.8.2 IPC 接口

通过 `settings:update` IPC 接口更新配置时，会自动调用 `syncManager.updateSyncConfig()` 来更新同步配置。

### 12.9 错误处理

- 同步过程中的错误会被捕获并记录到日志
- 同步状态会更新为 `error`，并保存错误信息
- 即使同步失败，应用仍能正常运行，使用本地配置

**文件路径**：`src/main/sync-manager.ts`

## 13. 总结

UniHub 的配置保存设计采用分层存储架构，根据不同场景选择合适的存储介质，提供了完整的配置管理功能。通过 SettingsManager 类统一管理主进程配置，使用 useLocalStorage 组合式函数简化前端配置操作，以及通过 Browser Polyfill 支持浏览器环境的配置存储，实现了跨环境的配置管理方案。

新增的配置同步功能通过 SyncManager 实现，使用 universal-sync-v2 库和 PouchDB 实现配置的跨设备同步，支持 WebDAV 作为远程存储后端。用户可以在设置界面配置 WebDAV 连接信息，启用自动同步功能，实现配置的实时备份和多设备同步。

该设计不仅满足了当前应用的配置需求，也为未来的功能扩展和插件开发提供了灵活的配置管理基础，同时通过同步功能提升了用户体验。
