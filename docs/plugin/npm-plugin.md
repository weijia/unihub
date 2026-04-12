# ESM npm 插件开发

## 概述

UniHub 支持通过 npm 安装 ESM 格式的插件，特别适用于 Web 版本。这种插件格式使用 ESM 模块系统，直接通过 CDN 加载，无需打包成 ZIP 文件。

## 插件格式

### 核心结构

ESM npm 插件需要导出一个包含以下属性的对象：

```typescript
interface Plugin {
  metadata: PluginMetadata
  component: Component // Vue 组件
  enabled?: boolean
}

interface PluginMetadata {
  id: string // 唯一标识符
  name: string // 插件名称
  description: string // 插件描述
  version: string // 版本号
  author: string // 作者
  icon: string // SVG 路径
  category: 'formatter' | 'tool' | 'encoder' | 'custom' // 分类
  keywords: string[] // 关键词
  isThirdParty?: boolean // 是否为第三方插件
}
```

### 最小示例

```typescript
import MyComponent from './MyComponent.vue'

export default {
  metadata: {
    id: 'my-npm-plugin',
    name: '我的 npm 插件',
    description: '这是一个 ESM npm 插件示例',
    version: '1.0.0',
    author: 'Your Name',
    icon: 'M12 2L2 7l10 5 10-5-10-5z',
    category: 'tool',
    keywords: ['example', 'npm']
  },
  component: MyComponent,
  enabled: true
}
```

## 项目结构

### 推荐结构

```
unihub-plugin-demo/
├── src/
│   ├── index.ts       # 插件入口
│   ├── MyComponent.vue # 插件组件
│   └── types.ts       # 类型定义（可选）
├── package.json       # npm 配置
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # 构建配置
```

### package.json 配置

```json
{
  "name": "unihub-plugin-demo",
  "version": "1.0.0",
  "description": "UniHub ESM npm 插件示例",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vue-tsc": "^3.1.0"
  }
}
```

## 开发流程

### 1. 创建项目

```bash
# 创建目录
mkdir unihub-plugin-demo
cd unihub-plugin-demo

# 初始化项目
npm init -y

# 安装依赖
npm install vue
npm install -D @vitejs/plugin-vue typescript vite vue-tsc
```

### 2. 配置构建工具

**vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
```

**tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. 编写插件代码

**src/index.ts**

```typescript
import type { Plugin } from './types'
import HelloWorld from './HelloWorld.vue'

const plugin: Plugin = {
  metadata: {
    id: 'unihub-plugin-hello',
    name: 'Hello World',
    description: '一个简单的 Hello World 插件',
    version: '1.0.0',
    author: 'UniHub',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    category: 'tool',
    keywords: ['hello', 'demo', 'example']
  },
  component: HelloWorld,
  enabled: true
}

export default plugin
```

**src/types.ts**

```typescript
import type { Component } from 'vue'

export interface PluginMetadata {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string
  category: 'formatter' | 'tool' | 'encoder' | 'custom'
  keywords: string[]
  isThirdParty?: boolean
}

export interface Plugin {
  metadata: PluginMetadata
  component: Component
  enabled?: boolean
}
```

**src/HelloWorld.vue**

```vue
<template>
  <div class="hello-world">
    <h2>{{ pluginName }}</h2>
    <p>{{ description }}</p>
    <button @click="sayHello">点击我</button>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  pluginName: string
  description: string
}>()

const message = ref('')

const sayHello = () => {
  message.value = 'Hello, UniHub!'
}
</script>

<style scoped>
.hello-world {
  padding: 20px;
  text-align: center;
}

h2 {
  color: #3b82f6;
  margin-bottom: 16px;
}

p {
  margin-bottom: 16px;
  color: #6b7280;
}

button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}
</style>
```

### 4. 构建插件

```bash
npm run build
```

### 5. 发布到 npm

```bash
# 登录 npm
npm login

# 发布
npm publish
```

## 安装使用

在 UniHub Web 版中：

1. 打开 **设置 → 插件管理**
2. 切换到 **手动安装** 标签页
3. 在 **从 npm 安装插件** 部分：
   - 输入 npm 包名（如 `unihub-plugin-demo`）
   - 选择 CDN（esm.sh、unpkg.com 或 jsdelivr.net）
   - 点击 **从 npm 安装**

## 开发注意事项

1. **ESM 格式**：插件必须使用 ESM 格式（`"type": "module"`）
2. **Vue 组件**：插件组件必须是 Vue 3 组件
3. **依赖管理**：
   - 推荐将 Vue 作为 peerDependency
   - 避免打包过多依赖，保持插件体积小
4. **图标**：使用 SVG 路径作为图标，确保在不同主题下显示正常
5. **兼容性**：确保插件在 Web 环境中正常工作

## 调试技巧

1. **本地测试**：使用 `npm run dev` 启动开发服务器，然后在 UniHub 中通过开发模式加载
2. **CDN 测试**：发布到 npm 后，可以通过 CDN URL 直接测试
3. **错误排查**：查看浏览器控制台了解加载和运行时错误

## 示例插件

### 1. 计数器插件 (unihub-plugin-counter)

**功能**：一个简单的计数器工具，支持增减和重置操作。

**项目结构**：

```
unihub-plugin-counter/
├── src/
│   ├── index.ts       # 插件入口
│   ├── Counter.vue    # 计数器组件
│   └── types.ts       # 类型定义
├── package.json       # npm 配置
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # 构建配置
```

**核心代码**：

```typescript
// src/index.ts
import type { Plugin } from './types'
import Counter from './Counter.vue'

const plugin: Plugin = {
  metadata: {
    id: 'unihub-plugin-counter',
    name: '计数器',
    description: '一个简单的计数器插件',
    version: '1.0.0',
    author: 'UniHub Team',
    icon: 'M19 13H5v-2h14v2z',
    category: 'tool',
    keywords: ['counter', '工具', '计数']
  },
  component: Counter,
  enabled: true
}

export default plugin
```

```vue
<!-- src/Counter.vue -->
<template>
  <div class="counter">
    <h2>计数器</h2>
    <p class="count">{{ count }}</p>
    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="reset">重置</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

const increment = () => {
  count.value++
}

const decrement = () => {
  count.value--
}

const reset = () => {
  count.value = 0
}
</script>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}

h2 {
  color: #3b82f6;
  margin-bottom: 20px;
}

.count {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #1f2937;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

button {
  padding: 10px 20px;
  font-size: 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  opacity: 0.9;
}

button:first-child {
  background-color: #ef4444;
  color: white;
}

button:nth-child(2) {
  background-color: #6b7280;
  color: white;
}

button:last-child {
  background-color: #10b981;
  color: white;
}
</style>
```

**安装使用**：

在 UniHub Web 版中，输入 `unihub-plugin-counter` 作为 npm 包名进行安装。

### 2. Hello World 插件 (unihub-plugin-hello)

**功能**：一个简单的 Hello World 示例插件。

**安装**：在 UniHub Web 版中输入 `unihub-plugin-hello` 进行安装。

## 常见问题

### 1. 插件加载失败

- 检查 npm 包名是否正确
- 确保插件导出格式正确
- 检查 CDN 是否能访问

### 2. 组件不显示

- 确保组件是正确的 Vue 3 组件
- 检查组件是否有语法错误
- 查看浏览器控制台错误信息

### 3. 依赖问题

- 避免使用过多依赖
- 对于大型依赖，考虑使用 CDN 外部引入

## 最佳实践

1. **保持简洁**：插件功能单一，职责明确
2. **性能优化**：减少打包体积，优化渲染性能
3. **用户体验**：提供清晰的界面和交互
4. **文档完善**：提供详细的使用说明
5. **版本管理**：遵循语义化版本规范
