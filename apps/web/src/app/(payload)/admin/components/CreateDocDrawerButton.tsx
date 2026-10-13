'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui'
import type { CreateDocDrawerInnerProps } from './CreateDocDrawerInner'

type InnerComponent = React.ComponentType<CreateDocDrawerInnerProps>

export interface CreateDocDrawerButtonProps {
  collectionSlug: string
  label?: string
  className?: string
}

/**
 * Slide-over create parity with the AdminGUI mockup — opens Payload's
 * DocumentDrawer (full create form, no page navigation). The payload-side
 * drawer is lazy-imported on first click so SSR markup and unit-test renders
 * stay free of the @payloadcms/ui provider/scss chain.
 */
export const CreateDocDrawerButton: React.FC<CreateDocDrawerButtonProps> = ({
  collectionSlug,
  label = 'Create New',
  className,
}) => {
  const [Inner, setInner] = useState<InnerComponent | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [openSignal, setOpenSignal] = useState(0)

  const handleClick = () => {
    setOpenSignal((n) => n + 1)
    if (!Inner && !loading) {
      setLoading(true)
      setLoadFailed(false)
      import('./CreateDocDrawerInner')
        .then((m) => setInner(() => m.CreateDocDrawerInner))
        .catch(() => setLoadFailed(true))
        .finally(() => setLoading(false))
    }
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        className={className}
        onClick={handleClick}
        loading={loading}
        title={loadFailed ? 'Editor failed to load — click to retry' : undefined}
        aria-label={label}
        data-create-drawer={collectionSlug}
      >
        <Plus className="bmr-btn-icon" aria-hidden="true" />
        {label}
      </Button>
      {Inner && <Inner collectionSlug={collectionSlug} openSignal={openSignal} />}
    </>
  )
}

export default CreateDocDrawerButton
