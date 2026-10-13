'use client'

import { useEffect } from 'react'

const ADMIN_SKINS = ['precision-dark', 'cyber-neon', 'light-clean', 'classic-payload'] as const

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
  return typeof next === 'string' && (ADMIN_SKINS as readonly string[]).includes(next) ? next : null
}

export const AdminThemeSync: React.FC<{ defaultTheme?: string }> = ({ defaultTheme }) => {
  useEffect(() => {
    const applyTheme = (t: string) => {
      document.documentElement.setAttribute('data-admin-theme', t)
      document.documentElement.setAttribute('data-theme', t === 'light-clean' ? 'light' : 'dark')
    }

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
        applyTheme(next)
      }
    }

    // Intercept form changes on SiteSettings page (e.g. adminTheme select input)
    const handleDocumentChange = (e: Event) => {
      const target = e.target as HTMLSelectElement | HTMLInputElement | null
      if (target) {
        const name = target.name || target.id || ''
        if (name.includes('adminTheme')) {
          const val = target.value
          if (val && ['precision-dark', 'cyber-neon', 'light-clean', 'classic-payload'].includes(val)) {
            localStorage.setItem('bmr_admin_theme', val)
            document.cookie = `bmr_admin_theme=${val}; path=/; max-age=31536000; SameSite=Lax`
            applyTheme(val)
          }
        }
      }
    }

    // Intercept fetch requests to /api/globals/site-settings to catch saves immediately
    const origFetch = window.fetch
    window.fetch = async (...args) => {
      const res = await origFetch(...args)
      try {
        const input = args[0]
        const url = typeof input === 'string' ? input : (input as Request)?.url || ''
        const method = typeof input === 'string' ? args[1]?.method : (input as Request)?.method
        if (res.ok && url.includes('/api/globals/site-settings')) {
          const data = await res.clone().json()
          const nextTheme = adminThemeFromSaveResponse(url, method, data)
          if (nextTheme) {
            localStorage.setItem('bmr_admin_theme', nextTheme)
            document.cookie = `bmr_admin_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`
            applyTheme(nextTheme)
          }
        }
      } catch {}
      return res
    }

    window.addEventListener('bmr-admin-theme-change', handleThemeChange as EventListener)
    document.addEventListener('change', handleDocumentChange)

    return () => {
      window.removeEventListener('bmr-admin-theme-change', handleThemeChange as EventListener)
      document.removeEventListener('change', handleDocumentChange)
      window.fetch = origFetch
    }
  }, [defaultTheme])

  return null
}

export default AdminThemeSync
