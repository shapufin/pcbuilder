import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import type { ServerFunctionClient } from 'payload'
import { cookies } from 'next/headers'
import { importMap } from './admin/importMap'
import '@payloadcms/next/css'
import './admin.css'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies()
  const adminTheme = cookieStore.get('bmr_admin_theme')?.value || 'precision-dark'

  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-admin-theme', '${adminTheme}');`,
        }}
      />
      <div data-admin-theme={adminTheme} style={{ display: 'contents' }}>
        {children}
      </div>
    </RootLayout>
  )
}

export default Layout

