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
