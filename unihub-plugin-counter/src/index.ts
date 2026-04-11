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
