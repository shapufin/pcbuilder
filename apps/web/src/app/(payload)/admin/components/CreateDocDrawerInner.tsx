'use client'

import React, { useEffect } from 'react'
import { useDocumentDrawer } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

export interface CreateDocDrawerInnerProps {
  collectionSlug: string
  /** Incremented on every create click — reopen trigger while mounted. */
  openSignal: number
}

/**
 * Payload-side half of CreateDocDrawerButton. Rendered only inside the admin
 * provider tree (lazy chunk), so it may consume useDocumentDrawer/useModal —
 * with `id` omitted the drawer renders the collection's create view as a
 * slide-over instead of navigating to /create.
 */
export const CreateDocDrawerInner: React.FC<CreateDocDrawerInnerProps> = ({
  collectionSlug,
  openSignal,
}) => {
  const router = useRouter()
  const [Drawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({ collectionSlug })

  useEffect(() => {
    if (openSignal > 0) openDrawer()
  }, [openSignal, openDrawer])

  return (
    <Drawer
      redirectAfterCreate={false}
      onSave={() => {
        // Payload only calls onSave after a successful write — validation
        // failures keep the drawer open with field errors. On success, close
        // the slide-over so the user lands back on the (now refreshed) list.
        closeDrawer()
        // The list under the drawer is server-rendered — refresh it so the
        // new document appears without a manual reload.
        router.refresh()
      }}
    />
  )
}

export default CreateDocDrawerInner
