import { create } from 'zustand'

type CartDrawerState = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Entry 23 item 3 - cart drawer open state: a module-level zustand store so
 * product/builder add-to-cart entry points can open the same drawer that the
 * root layout renders.
 */
export const useCartDrawerStore = create<CartDrawerState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
