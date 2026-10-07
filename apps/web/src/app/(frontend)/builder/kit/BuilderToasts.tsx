'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Design kit (entry 50 P2): toast leggeri per le azioni del builder
 * (save/deploy/import…). Provider-agnostic: un design fa
 *   const { toasts, add, dismiss } = useToast()
 *   <BuilderToasts toasts={toasts} onDismiss={dismiss} />
 * e accoda messaggi con add(). Auto-dismiss 2.5 s, role="status" polite.
 */

export interface BuilderToast {
  id: number
  message: string
  kind: 'info' | 'success' | 'error'
}

const AUTO_DISMISS_MS = 2500

export function useToast() {
  const nextId = useRef(0)
  const [toasts, setToasts] = useState<BuilderToast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (message: string, kind: BuilderToast['kind'] = 'info') => {
      const id = ++nextId.current
      setToasts((current) => [...current, { id, message, kind }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      return id
    },
    [dismiss],
  )

  return { toasts, add, dismiss }
}

export function BuilderToasts({
  toasts,
  onDismiss,
}: {
  toasts: BuilderToast[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div className="builder-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={`builder-toast builder-toast--${toast.kind}`}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="builder-toast__dismiss"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
