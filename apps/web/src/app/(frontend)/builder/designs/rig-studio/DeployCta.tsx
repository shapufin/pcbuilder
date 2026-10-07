'use client'

import { Zap } from 'lucide-react'

/**
 * Shared deploy CTA (header + BuildPriceCard): opens the DeployModal — one
 * place to touch, identical markup everywhere.
 */
export function DeployCta({ onDeploy }: { onDeploy: () => void }) {
  return (
    <button type="button" className="studio-deploy" onClick={onDeploy}>
      <Zap size={14} aria-hidden="true" />
      Deploy rig
    </button>
  )
}
