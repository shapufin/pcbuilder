import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import type { ServerFunctionClient } from 'payload'
import { importMap } from './admin/importMap'
import { AdminThemeSync } from './admin/components/AdminThemeSync'
import { getSiteSettings } from '@/lib/site-settings.server'
import { ToastProvider, CommandPalette } from './admin/ui'
import '@payloadcms/next/css'
// Shared design tokens (--space-*, --text-*, --radius-*, --duration-*,
// --color-*). The admin skin reads the same scale as the storefront; without
// this import every tokenised value in admin.css resolved to nothing.
import '@buildmyrig/ui/tokens.css'
import './admin.css'
import './admin/ui/ui.css'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const siteSettings = await getSiteSettings()
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      <AdminThemeSync defaultTheme={siteSettings.adminTheme} />
      <ToastProvider>
        {children}
        <CommandPalette />
      </ToastProvider>
    </RootLayout>
  )
}


export default Layout

