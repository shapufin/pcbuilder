import { describe, expect, it } from 'vitest'
import { useCartDrawerStore } from './cart-drawer-store'

/**
 * Entry 23 item 3 - cart drawer open state lives outside React so the
 * header badge, product Add-to-cart and builder summary can open the same
 * drawer imperatively.
 */
describe('cart drawer store', () => {
  it('#176 starts closed; open/close are idempotent', () => {
    expect(useCartDrawerStore.getState().isOpen).toBe(false)

    useCartDrawerStore.getState().open()
    expect(useCartDrawerStore.getState().isOpen).toBe(true)
    useCartDrawerStore.getState().open()
    expect(useCartDrawerStore.getState().isOpen).toBe(true)

    useCartDrawerStore.getState().close()
    expect(useCartDrawerStore.getState().isOpen).toBe(false)
    useCartDrawerStore.getState().close()
    expect(useCartDrawerStore.getState().isOpen).toBe(false)
  })

  it('#176b toggle flips the drawer', () => {
    useCartDrawerStore.getState().toggle()
    expect(useCartDrawerStore.getState().isOpen).toBe(true)
    useCartDrawerStore.getState().toggle()
    expect(useCartDrawerStore.getState().isOpen).toBe(false)
  })

  it('#176c state is shared across subscribers (single module store)', () => {
    const readA = () => useCartDrawerStore.getState().isOpen
    useCartDrawerStore.getState().open()
    expect(readA()).toBe(true)
    useCartDrawerStore.setState({ isOpen: false })
    expect(readA()).toBe(false)
  })
})
