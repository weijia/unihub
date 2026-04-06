import type { Plugin } from '@/types/plugin'
import TwoFactorAuth from './2fa-authenticator.vue'
import ColorPicker from './color-picker.vue'
import CodeDiff from './code-diff.vue'

// Web 版插件列表
export const webPlugins: Plugin[] = [
  {
    metadata: {
      id: '2fa',
      name: '2FA 验证码',
      description: 'TOTP 双因素验证码生成',
      version: '1.0.0',
      author: 'UniHub',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      category: 'tool',
      keywords: ['2fa', 'totp', 'otp', 'auth', '验证码']
    },
    component: TwoFactorAuth,
    enabled: true
  },
  {
    metadata: {
      id: 'color-picker',
      name: '取色器',
      description: '颜色取色和格式转换',
      version: '1.0.0',
      author: 'UniHub',
      icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z',
      category: 'tool',
      keywords: ['color', 'picker', '取色', '颜色']
    },
    component: ColorPicker,
    enabled: true
  },
  {
    metadata: {
      id: 'code-diff',
      name: '代码对比',
      description: '代码差异对比工具',
      version: '1.0.0',
      author: 'UniHub',
      icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      category: 'tool',
      keywords: ['code', 'diff', '对比', '代码']
    },
    component: CodeDiff,
    enabled: true
  }
]
