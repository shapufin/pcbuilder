import type { Config, Plugin } from 'payload'

/**
 * plugin-shop — cart, orders, pricing, inventory, discounts.
 * Phase 1 will inject the commerce collections (see docs/buildmyrig-plan/05-plugin-contracts.md).
 */
export interface ShopPluginOptions {
  /** Enable or disable the plugin. @default true */
  enabled?: boolean
  /** Order number prefix. @default 'BMR' */
  orderNumberPrefix?: string
}

export const shopPlugin =
  (pluginOptions: ShopPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig

    let config = { ...incomingConfig }
    // Phase 1: spread commerce collections, endpoints, hooks here.
    config.collections = [...(config.collections || [])]
    return config
  }

export default shopPlugin
