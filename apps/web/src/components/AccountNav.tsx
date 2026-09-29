'use client'

import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

/** Entry 15: header link — Account when signed in, Sign in otherwise.
 * Lives inside EcommerceShell, so useEcommerce() is available. */
export function AccountNav() {
  const { user } = useEcommerce()
  return (
    <Link
      href={user ? '/account' : '/auth/login'}
      style={{ color: '#94a3b8', textDecoration: 'none', marginLeft: 'auto' }}
    >
      {user ? 'Account' : 'Sign in'}
    </Link>
  )
}
