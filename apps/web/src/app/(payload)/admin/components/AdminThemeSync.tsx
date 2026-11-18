'use client'

import { useEffect } from 'react'
import { ADMIN_THEME_IDS, applyAdminTheme } from './adminTheme.ts'

// Entry 110: only write (non-GET) responses may restyle the console. The
// site-settings edit header telemetry-fetches the global via window.fetch on
// page load — treating that read as a save would clobber the admin's local
// skin selection every time they open the view.
export const adminThemeFromSaveResponse = (
  url: string,
  method: string | undefined,
  data: unknown,
): string | null => {
  if (!url.includes('/api/globals/site-settings')) return null
  if ((method ?? 'GET').toUpperCase() === 'GET') return null
  const next = (data as { doc?: { adminTheme?: unknown } })?.doc?.adminTheme
    ?? (data as { adminTheme?: unknown })?.adminTheme
  return typeof next === 'string' && ADMIN_THEME_IDS.includes(next) ? next : null
}

export const AdminThemeSync: React.FC<{ defaultTheme?: string }> = ({ defaultTheme }) => {
  useEffect(() => {
    // One applier for the whole console (adminTheme.ts) — it keeps
    // data-admin-theme, data-theme and the Payload theme cookie in step.
    const applyTheme = (t: string) => applyAdminTheme(t)

    // Read theme from localStorage or document cookie, falling back to defaultTheme from SiteSettings
    const stored = typeof window !== 'undefined' ? localStorage.getItem('bmr_admin_theme') : null
    let theme = stored
    if (!theme) {
      const match = document.cookie.match(/bmr_admin_theme=([^;]+)/)
      if (match) theme = match[1]
    }
    const currentTheme = theme || defaultTheme || 'precision-dark'
    applyTheme(currentTheme)

    const handleThemeChange = (e: CustomEvent<string>) => {
      const next = e.detail
      if (next) {
        // Already broadcast — re-dispatching here recursed until the stack blew.
        applyAdminTheme(next, false)
      }
    }

    // Intercept form changes on SiteSettings page (e.g. adminTheme select input)
    const handleDocumentChange = (e: Event) => {
      const target = e.target as HTMLSelectElement | HTMLInputElement | null
      if (target) {
        const name = target.name || target.id || ''
        if (name.includes('adminTheme')) {
          const val = target.value
          if (val && ADMIN_THEME_IDS.includes(val)) {
            applyTheme(val)
          }
        }
      }
    }

    // Intercept fetch requests to /api/globals/site-settings at most once
    const win = typeof window !== 'undefined' ? (window as unknown as { __bmr_fetch_patched?: boolean }) : null
    let origFetch: typeof window.fetch | null = null
    if (win && !win.__bmr_fetch_patched) {
      win.__bmr_fetch_patched = true
      origFetch = window.fetch
      window.fetch = async (...args) => {
        const res = await (origFetch || fetch)(...args)
        try {
          const input = args[0]
          const url = typeof input === 'string' ? input : (input as Request)?.url || ''
          const method = typeof input === 'string' ? args[1]?.method : (input as Request)?.method
          if (res.ok && url.includes('/api/globals/site-settings')) {
            const data = await res.clone().json()
            const nextTheme = adminThemeFromSaveResponse(url, method, data)
            if (nextTheme) {
              applyTheme(nextTheme)
            }
          }
        } catch {}
        return res
      }
    }

    window.addEventListener('bmr-admin-theme-change', handleThemeChange as EventListener)
    document.addEventListener('change', handleDocumentChange)

    return () => {
      window.removeEventListener('bmr-admin-theme-change', handleThemeChange as EventListener)
      document.removeEventListener('change', handleDocumentChange)
      if (win && origFetch) {
        window.fetch = origFetch
        win.__bmr_fetch_patched = false
      }
    }
  }, [defaultTheme])

  return null
}

export default AdminThemeSync
