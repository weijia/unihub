import type { Component } from 'vue'
import type { Plugin, PluginMetadata } from '@/types/plugin'

export interface NpmPluginInfo {
  packageName: string
  version?: string
  cdn?: 'esm.sh' | 'unpkg.com' | 'jsdelivr.net'
}

export async function loadNpmPlugin(info: NpmPluginInfo): Promise<Plugin> {
  const cdn = info.cdn || 'esm.sh'
  const version = info.version ? `@${info.version}` : ''
  let moduleUrl: string

  switch (cdn) {
    case 'esm.sh':
      moduleUrl = `https://esm.sh/${info.packageName}${version}`
      break
    case 'unpkg.com':
      moduleUrl = `https://unpkg.com/${info.packageName}${version}?module`
      break
    case 'jsdelivr.net':
      moduleUrl = `https://cdn.jsdelivr.net/npm/${info.packageName}${version}/+esm`
      break
  }

  const module = await import(/* @vite-ignore */ moduleUrl)
  const pluginExport = module.default || module

  if (!pluginExport.metadata || !pluginExport.component) {
    throw new Error('Invalid plugin format: must export metadata and component')
  }

  const metadata: PluginMetadata = {
    ...pluginExport.metadata,
    isThirdParty: true
  }

  return {
    metadata,
    component: pluginExport.component as Component,
    enabled: true
  }
}
