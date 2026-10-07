'use client'

import type { BuilderIndex } from '@buildmyrig/lib'

type Category = BuilderIndex['categories'][number]

interface Props {
  categories: Category[]
  selections: Record<string, string[]>
  stepIndex: number
  onSelect: (index: number) => void
}

export function StepNavigation({ categories, selections, stepIndex, onSelect }: Props) {
  return (
    <nav className="step-nav" aria-label="Build steps">
      {categories.map((category, i) => {
        const done = (selections[category.id] ?? []).length > 0
        return (
          <button
            key={category.id}
            type="button"
            className={`step-chip${done ? ' step-chip--done' : ''}`}
            aria-current={i === stepIndex ? 'step' : undefined}
            onClick={() => onSelect(i)}
          >
            {i + 1}. {category.name}
            {category.required ? (
              done ? <span className="step-badge step-badge--done">✓</span> : (
                <span className="step-badge">required</span>
              )
            ) : (
              <span className="step-badge step-badge--optional">optional</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
