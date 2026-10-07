'use client'

import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

/** Entry 15: header link — Account when signed in, Sign in otherwise.
 * Lives inside EcommerceShell, so useEcommerce() is available. */
export function AccountNav({ className }: { className?: string }) {
  const { user } = useEcommerce()
  return (
    <Link href={user ? '/account' : '/auth/login'} className={className}>
      {user ? 'Account' : 'Sign in'}
    </Link>
  )
}
