import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  ToastProvider,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Tooltip,
  FloatingBatchBar,
} from './index'

describe('Admin GUI Overlay Primitives (#471–#477)', () => {
  describe('Toast & ToastProvider', () => {
    it('#471 ToastProvider renders children and viewport container', () => {
      const html = renderToStaticMarkup(
        <ToastProvider>
          <div>Admin Child Content</div>
        </ToastProvider>,
      )
      expect(html).toContain('Admin Child Content')
      expect(html).toContain('bmr-toast-viewport')
      expect(html).toContain('aria-live="polite"')
    })
  })

  describe('Dialog', () => {
    it('#472 Dialog renders trigger button', () => {
      const html = renderToStaticMarkup(
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogTrigger className="custom-trigger">Open Modal</DialogTrigger>
        </Dialog>,
      )
      expect(html).toContain('<button')
      expect(html).toContain('Open Modal')
      expect(html).toContain('custom-trigger')
    })

    it('#473 DialogContent renders backdrop, dialog window, header, title, and footer when open', () => {
      const html = renderToStaticMarkup(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Feature</DialogTitle>
              <DialogDescription>Adjust runtime feature flags</DialogDescription>
            </DialogHeader>
            <p>Body Content</p>
            <DialogFooter>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      )
      expect(html).toContain('bmr-dialog-backdrop')
      expect(html).toContain('bmr-dialog-container')
      expect(html).toContain('bmr-dialog')
      expect(html).toContain('role="dialog"')
      expect(html).toContain('aria-modal="true"')
      expect(html).toContain('bmr-dialog__header')
      expect(html).toContain('Configure Feature')
      expect(html).toContain('Adjust runtime feature flags')
      expect(html).toContain('Body Content')
      expect(html).toContain('bmr-dialog__footer')
      expect(html).toContain('aria-label="Close dialog"')
    })

    it('#474 DialogContent does not render when open is false', () => {
      const html = renderToStaticMarkup(
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogContent>
            <DialogTitle>Hidden</DialogTitle>
          </DialogContent>
        </Dialog>,
      )
      expect(html).not.toContain('bmr-dialog')
      expect(html).not.toContain('Hidden')
    })
  })

  describe('Sheet', () => {
    it('#475 SheetContent renders drawer panel with side modifier when open', () => {
      const htmlRight = renderToStaticMarkup(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Filter products</SheetDescription>
            </SheetHeader>
            <div>Drawer Content</div>
          </SheetContent>
        </Sheet>,
      )
      expect(htmlRight).toContain('bmr-sheet-backdrop')
      expect(htmlRight).toContain('bmr-sheet-container')
      expect(htmlRight).toContain('bmr-sheet')
      expect(htmlRight).toContain('bmr-sheet--right')
      expect(htmlRight).toContain('Filters')
      expect(htmlRight).toContain('Filter products')
      expect(htmlRight).toContain('Drawer Content')
      expect(htmlRight).toContain('aria-label="Close sheet"')

      const htmlLeft = renderToStaticMarkup(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="left">
            <SheetTitle>Left Drawer</SheetTitle>
          </SheetContent>
        </Sheet>,
      )
      expect(htmlLeft).toContain('bmr-sheet--left')
    })
  })

  describe('Tooltip', () => {
    it('#476 Tooltip renders wrapper element around child content', () => {
      const html = renderToStaticMarkup(
        <Tooltip content="Quick Help">
          <button>Hover Target</button>
        </Tooltip>,
      )
      expect(html).toContain('bmr-tooltip-wrapper')
      expect(html).toContain('Hover Target')
    })
  })

  describe('FloatingBatchBar', () => {
    it('#477 FloatingBatchBar renders high-contrast bar when selectedCount > 0, returns null when 0', () => {
      const htmlHidden = renderToStaticMarkup(
        <FloatingBatchBar selectedCount={0} onDeselectAll={() => {}} />,
      )
      expect(htmlHidden).toBe('')

      const htmlVisible = renderToStaticMarkup(
        <FloatingBatchBar selectedCount={5} onDeselectAll={() => {}}>
          <button>Bulk Delete</button>
        </FloatingBatchBar>,
      )
      expect(htmlVisible).toContain('bmr-batch-bar')
      expect(htmlVisible).toContain('role="toolbar"')
      expect(htmlVisible).toContain('aria-label="Bulk actions toolbar"')
      expect(htmlVisible).toContain('bmr-batch-bar__count-badge')
      expect(htmlVisible).toContain('>5<')
      expect(htmlVisible).toContain('selected')
      expect(htmlVisible).toContain('Bulk Delete')
      expect(htmlVisible).toContain('aria-label="Deselect all"')
      expect(htmlVisible).toContain('Clear selection')
    })
  })
})
