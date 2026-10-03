import type { ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { BuilderDesign } from '@buildmyrig/plugin-pc-builder'
import { Configurator } from './configure/Configurator'

/**
 * Registry slug → componente dei builder designs (entry 50 P2). Le chiavi
 * sono il contratto col plugin (`BUILDER_DESIGNS`) — il parity test #331
 * le tiene allineate. 'rig-studio' è code-split: chi usa classic non
 * scarica lo studio. dynamic() qui è nel module graph client (importato
 * solo da BuilderShell, 'use client') — code-splitting dei client
 * components funziona solo in questo punto, non nei server components.
 */
export const BUILDER_DESIGN_COMPONENTS = {
  classic: Configurator,
  'rig-studio': dynamic(() => import('./designs/rig-studio').then((m) => m.RigStudioDesign)),
} satisfies Record<BuilderDesign, ComponentType>
