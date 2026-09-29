'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BuilderIndex } from '@buildmyrig/lib'

export type IndexStatus = 'loading' | 'error' | 'ready'

/** Client fetch of GET /api/builder/index with explicit loading/error/retry states (09-routes). */
export const useBuilderIndex = (): {
  index: BuilderIndex | null
  status: IndexStatus
  retry: () => void
} => {
  const [index, setIndex] = useState<BuilderIndex | null>(null)
  const [status, setStatus] = useState<IndexStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/builder/index', { cache: 'no-store' })
        if (!res.ok) throw new Error(`index request failed (${res.status})`)
        const data: BuilderIndex = await res.json()
        if (cancelled) return
        setIndex(data)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return { index, status, retry }
}
