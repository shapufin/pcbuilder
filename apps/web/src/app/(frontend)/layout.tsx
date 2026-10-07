import React from 'react'
import '@buildmyrig/ui/tokens.css'
import './globals.css'
import '../../components/ui/primitives.css'
import '../../components/shell.css'
import Script from 'next/script'
import { Inter, Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { EcommerceShell } from '../../components/EcommerceShell'
import { CartDrawerLazy } from '../../components/CartDrawerLazy'
import { SiteHeader } from '../../components/SiteHeader'
import { SiteFooter } from '../../components/SiteFooter'
import { NexusHeader } from '../../themes/nexus/NexusHeader'
import { NexusFooter } from '../../themes/nexus/NexusFooter'
import { getSiteSettings } from '@/lib/site-settings.server'
import { getMegaMenu } from '@/themes/nexus/lib/mega-menu.server'
import '../../themes/nexus/nexus.css'
import { getThemeAssets, THEME_BOOT_SCRIPT } from '@/lib/theme.server'
import { JsonLd, organizationJsonLd } from '@/lib/jsonld'

// Plausible (12-integrations-ops.md): script only when a domain is configured,
// so dev/CI stay cookie-consent-free and offline.
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

// Google fonts self-hosted via next/font; the CSS variables are referenced by
// tokens.css (--font-sans/--font-display) and the theme global's default
// stacks (DEFAULT_FONTS in plugin-pages lib/theme.ts).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' })
// Entry 71 Nexus pack fonts — always loaded (both are lightweight subsets);
// the nexus component layer pins these on its own --nx-font-* vars.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  // Without metadataBase, relative OG image URLs resolve to nothing absolute.
  metadataBase: new URL(process.env.BMR_URL || 'http://localhost:3000'),
  // Pages that don't define generateMetadata fall back here; pages that do
  // own their full title (existing routes already append " | BuildMyRig").
  title: 'BuildMyRig — custom PCs, configured your way',
  description: 'Pre-built gaming and creator PCs, or configure your own — step by step.',
}

// themeColor must be a literal CSS color — hsl() keeps it out of the
// raw-hex lint while approximating the rig-dark --color-bg in tokens.css
// (update both together).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'hsl(222 30% 8%)',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [siteSettings, theme] = await Promise.all([getSiteSettings(), getThemeAssets()])
  const isNexus = theme.pack === 'nexus'
  const megaMenu = isNexus ? await getMegaMenu() : { sections: [] }
  return (
    // suppressHydrationWarning: pre-hydration scripts (Payload admin theme
    // boot on /admin, browser extensions) add data-theme/dir to <html> before
    // React loads — intentional DOM state, not a real mismatch.
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body data-theme-pack={theme.pack}>
        {/* suppressHydrationWarning on the three theme styles: the boot
            script below rewrites their `media` attrs pre-hydration, which is
            intentional DOM state React must not treat as a mismatch. */}
        <style
          id="theme-vars"
          media="all"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: theme.css }}
        />
        {theme.skin ? (
          <style
            id="theme-skin"
            media="all"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: theme.skin }}
          />
        ) : null}
        {/* Entry 60 visitor toggle: the full alt preset ships inert
            (media="not all"); the boot script flips it on pre-paint when
            localStorage.bmr_theme === 'alt'. */}
        <style
          id="theme-alt"
          media="not all"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: theme.altCss }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={organizationJsonLd()} />
        {plausibleDomain ? (
          <Script src="https://plausible.io/js/script.js" data-domain={plausibleDomain} strategy="afterInteractive" />
        ) : null}
        <EcommerceShell>
          {isNexus ? (
            <NexusHeader
              navLinks={siteSettings.navLinks}
              announcements={siteSettings.announcements}
              megaMenu={megaMenu.sections}
              themeLabels={{ altLabel: theme.altLabel, defaultLabel: theme.defaultLabel }}
            />
          ) : (
            <SiteHeader
              navLinks={siteSettings.navLinks}
              themeLabels={{ altLabel: theme.altLabel, defaultLabel: theme.defaultLabel }}
            />
          )}
          <CartDrawerLazy />
          <div id="main-content">{children}</div>
          {isNexus ? <NexusFooter /> : <SiteFooter />}
        </EcommerceShell>
      </body>
    </html>
  )
}
