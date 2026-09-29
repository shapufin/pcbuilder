import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Draft persisted in localStorage so a half-finished build survives a refresh (07-ux-plan §2). */

export interface TemplateSlot {
  categoryId: string
  componentId: string
}

export type BuilderMode = 'scratch' | 'guided' | 'template'

interface BuilderState {
  mode: BuilderMode
  templateId: string | null
  /** server-persisted draft (POST /api/builder/builds) — set by the summary CTAs */
  buildId: string | null
  shareId: string | null
  /** categoryId -> componentIds (multi-select slots keep order) */
  selections: Record<string, string[]>
  stepIndex: number
  query: string
  brand: string | null
  startFresh: (mode?: BuilderMode) => void
  applyTemplate: (templateId: string, slots: TemplateSlot[], mode?: BuilderMode) => void
  saveBuild: (buildId: string, shareId: string) => void
  goToStep: (index: number) => void
  nextStep: (lastIndex: number) => void
  prevStep: () => void
  toggleSelect: (categoryId: string, componentId: string, maxSelectable: number) => void
  removeComponent: (categoryId: string, componentId: string) => void
  clearSlot: (categoryId: string) => void
  setQuery: (query: string) => void
  setBrand: (brand: string | null) => void
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      mode: 'scratch',
      templateId: null,
      buildId: null,
      shareId: null,
      selections: {},
      stepIndex: 0,
      query: '',
      brand: null,

      startFresh: (mode = 'scratch') =>
        set({ mode, templateId: null, buildId: null, shareId: null, selections: {}, stepIndex: 0, query: '', brand: null }),

      applyTemplate: (templateId, slots, mode = 'template') => {
        const selections: Record<string, string[]> = {}
        for (const slot of slots) {
          if (!selections[slot.categoryId]) selections[slot.categoryId] = []
          if (!selections[slot.categoryId].includes(slot.componentId)) {
            selections[slot.categoryId].push(slot.componentId)
          }
        }
        set({ mode, templateId, buildId: null, shareId: null, selections, stepIndex: 0, query: '', brand: null })
      },

      saveBuild: (buildId, shareId) => set({ buildId, shareId }),

      goToStep: (index) => set({ stepIndex: Math.max(0, index) }),
      nextStep: (lastIndex) => set((s) => ({ stepIndex: Math.min(lastIndex, s.stepIndex + 1) })),
      prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

      // Entry-15 review (#93): any selection change invalidates the
      // server-persisted draft — the summary CTAs (save/claim/add-to-cart)
      // must create a fresh build doc instead of reusing one whose slots no
      // longer match the current configuration.
      toggleSelect: (categoryId, componentId, maxSelectable) =>
        set((s) => {
          const current = s.selections[categoryId] ?? []
          const selected = current.includes(componentId)
          if (maxSelectable <= 1) {
            return {
              buildId: null,
              shareId: null,
              selections: { ...s.selections, [categoryId]: selected ? [] : [componentId] },
            }
          }
          if (selected) {
            return {
              buildId: null,
              shareId: null,
              selections: { ...s.selections, [categoryId]: current.filter((id) => id !== componentId) },
            }
          }
          const next = [...current, componentId]
          return {
            buildId: null,
            shareId: null,
            selections: {
              ...s.selections,
              [categoryId]: next.length > maxSelectable ? next.slice(next.length - maxSelectable) : next,
            },
          }
        }),

      removeComponent: (categoryId, componentId) =>
        set((s) => ({
          buildId: null,
          shareId: null,
          selections: {
            ...s.selections,
            [categoryId]: (s.selections[categoryId] ?? []).filter((id) => id !== componentId),
          },
        })),

      clearSlot: (categoryId) =>
        set((s) => ({
          buildId: null,
          shareId: null,
          selections: { ...s.selections, [categoryId]: [] },
        })),

      setQuery: (query) => set({ query }),
      setBrand: (brand) => set({ brand }),
    }),
    {
      name: 'buildmyrig-draft-v1',
      partialize: (s) => ({
        mode: s.mode,
        templateId: s.templateId,
        buildId: s.buildId,
        shareId: s.shareId,
        selections: s.selections,
        stepIndex: s.stepIndex,
      }),
    },
  ),
)
