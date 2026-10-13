import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Checkbox,
  Switch,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  Progress,
  Skeleton,
  EmptyState,
} from './index'

vi.mock('next/link', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href: string
      children?: React.ReactNode
      [key: string]: unknown
    }) => jsx('a', { href, ...rest, children }),
  }
})

describe('Admin GUI Primitive Library (doc-22 §5)', () => {
  describe('Button', () => {
    it('#450 renders default primary button with bmr-btn and bmr-btn--primary', () => {
      const html = renderToStaticMarkup(<Button>Save Changes</Button>)
      expect(html).toContain('<button')
      expect(html).toContain('bmr-btn')
      expect(html).toContain('bmr-btn--primary')
      expect(html).toContain('Save Changes')
    })

    it('#451 renders real navigation element when href is provided', () => {
      const html = renderToStaticMarkup(<Button href="/admin/plugins">Plugins</Button>)
      expect(html).toContain('<a')
      expect(html).toContain('href="/admin/plugins"')
      expect(html).toContain('bmr-btn')
    })

    it('#452 applies variants, sizes and loading state with aria-busy', () => {
      const htmlVariants = renderToStaticMarkup(
        <div>
          <Button variant="secondary" size="sm">Secondary Sm</Button>
          <Button variant="outline" size="lg">Outline Lg</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="icon" aria-label="Settings">⚙</Button>
          <Button loading>Loading</Button>
        </div>
      )
      expect(htmlVariants).toContain('bmr-btn--secondary')
      expect(htmlVariants).toContain('bmr-btn--sm')
      expect(htmlVariants).toContain('bmr-btn--outline')
      expect(htmlVariants).toContain('bmr-btn--lg')
      expect(htmlVariants).toContain('bmr-btn--destructive')
      expect(htmlVariants).toContain('bmr-btn--subtle')
      expect(htmlVariants).toContain('bmr-btn--ghost')
      expect(htmlVariants).toContain('bmr-btn--link')
      expect(htmlVariants).toContain('bmr-btn--icon')
      expect(htmlVariants).toContain('bmr-btn--loading')
      expect(htmlVariants).toContain('aria-busy="true"')
      expect(htmlVariants).toContain('disabled')
    })
  })

  describe('Badge', () => {
    it('#453 renders status pills with dot/pulse and status variants', () => {
      const html = renderToStaticMarkup(
        <div>
          <Badge variant="success" dot pulse>Active</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Badge variant="info">Building</Badge>
          <Badge variant="subtle">v3.90</Badge>
        </div>
      )
      expect(html).toContain('bmr-badge--success')
      expect(html).toContain('bmr-badge__dot')
      expect(html).toContain('bmr-badge__dot--pulse')
      expect(html).toContain('bmr-badge--warning')
      expect(html).toContain('bmr-badge--destructive')
      expect(html).toContain('bmr-badge--info')
      expect(html).toContain('bmr-badge--subtle')
    })
  })

  describe('Card', () => {
    it('#454 renders compound card structure with hoverEffect support', () => {
      const html = renderToStaticMarkup(
        <Card hoverEffect>
          <CardHeader>
            <CardTitle>System Telemetry</CardTitle>
            <CardDescription>Real-time WAL and cache stats</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Database healthy.</p>
          </CardContent>
          <CardFooter>
            <button>Refresh</button>
          </CardFooter>
        </Card>
      )
      expect(html).toContain('bmr-card')
      expect(html).toContain('bmr-card--hoverable')
      expect(html).toContain('bmr-card__header')
      expect(html).toContain('bmr-card__title')
      expect(html).toContain('bmr-card__description')
      expect(html).toContain('bmr-card__content')
      expect(html).toContain('bmr-card__footer')
      expect(html).toContain('System Telemetry')
    })
  })

  describe('Form Controls: Input, Textarea, Checkbox, Switch', () => {
    it('#455 Input renders label, required mark, prefix/suffix and error feedback', () => {
      const html = renderToStaticMarkup(
        <Input
          label="Store Name"
          required
          prefixSlot={<span>https://</span>}
          suffixSlot={<span>.com</span>}
          error="Name already taken"
          placeholder="buildmyrig"
        />
      )
      expect(html).toContain('bmr-input-wrapper')
      expect(html).toContain('bmr-input-label')
      expect(html).toContain('bmr-input-label__required')
      expect(html).toContain('bmr-input')
      expect(html).toContain('bmr-input__prefix')
      expect(html).toContain('bmr-input__suffix')
      expect(html).toContain('bmr-input-error')
      expect(html).toContain('role="alert"')
      expect(html).toContain('Name already taken')
    })

    it('#456 Textarea renders label and helper text', () => {
      const html = renderToStaticMarkup(
        <Textarea
          label="Compatibility Notes"
          helperText="Visible to builders during configuration"
          rows={4}
        />
      )
      expect(html).toContain('bmr-textarea')
      expect(html).toContain('bmr-input-helper')
      expect(html).toContain('Compatibility Notes')
    })

    it('#457 Checkbox renders accessible 18px box with label and checked state', () => {
      const html = renderToStaticMarkup(
        <Checkbox id="c1" label="Enable automatic backups" checked readOnly />
      )
      expect(html).toContain('bmr-checkbox')
      expect(html).toContain('bmr-checkbox__box')
      expect(html).toContain('bmr-checkbox__label')
      expect(html).toContain('checked')
    })

    it('#458 Switch renders smooth toggle track with role switch and aria-checked', () => {
      const html = renderToStaticMarkup(
        <Switch id="s1" label="Maintenance Mode" checked readOnly />
      )
      expect(html).toContain('bmr-switch')
      expect(html).toContain('bmr-switch__track')
      expect(html).toContain('bmr-switch__thumb')
      expect(html).toContain('role="switch"')
      expect(html).toContain('aria-checked="true"')
    })
  })

  describe('Table compound', () => {
    it('#459 Table renders complete standard data table with numeric tabular-nums support', () => {
      const html = renderToStaticMarkup(
        <Table>
          <TableCaption>Active Inventory</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead numeric>Stock</TableHead>
              <TableHead numeric>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow selected>
              <TableCell>RTX-4090</TableCell>
              <TableCell numeric>14</TableCell>
              <TableCell numeric>€1,899.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell numeric>14</TableCell>
              <TableCell numeric>€1,899.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )
      expect(html).toContain('bmr-table-container')
      expect(html).toContain('bmr-table')
      expect(html).toContain('bmr-table__header')
      expect(html).toContain('bmr-table__row')
      expect(html).toContain('bmr-table__row--selected')
      expect(html).toContain('bmr-table__head')
      expect(html).toContain('bmr-table__cell')
      expect(html).toContain('bmr-table__cell--numeric')
      expect(html).toContain('bmr-table__caption')
    })
  })

  describe('Tabs compound', () => {
    it('#460 Tabs renders list, triggers and active tab panel content', () => {
      const html = renderToStaticMarkup(
        <Tabs value="general" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div>General Settings Content</div>
          </TabsContent>
          <TabsContent value="specs">
            <div>Specs Content</div>
          </TabsContent>
        </Tabs>
      )
      expect(html).toContain('bmr-tabs')
      expect(html).toContain('bmr-tabs__list')
      expect(html).toContain('bmr-tabs__trigger')
      expect(html).toContain('bmr-tabs__trigger--active')
      expect(html).toContain('aria-selected="true"')
      expect(html).toContain('role="tabpanel"')
      expect(html).toContain('General Settings Content')
      expect(html).not.toContain('Specs Content')
    })
  })

  describe('Utility primitives: Separator, Progress, Skeleton, EmptyState', () => {
    it('#461 Separator renders horizontal and vertical dividers', () => {
      const htmlH = renderToStaticMarkup(<Separator />)
      const htmlV = renderToStaticMarkup(<Separator orientation="vertical" />)
      expect(htmlH).toContain('bmr-separator')
      expect(htmlH).toContain('bmr-separator--horizontal')
      expect(htmlV).toContain('bmr-separator--vertical')
    })

    it('#462 Progress renders progress bar with proper aria attributes', () => {
      const html = renderToStaticMarkup(<Progress value={65} max={100} />)
      expect(html).toContain('bmr-progress')
      expect(html).toContain('bmr-progress__bar')
      expect(html).toContain('role="progressbar"')
      expect(html).toContain('aria-valuenow="65"')
    })

    it('#463 Skeleton renders aria-hidden animated placeholder with custom dimensions', () => {
      const html = renderToStaticMarkup(<Skeleton width="180px" height="24px" radius="6px" />)
      expect(html).toContain('bmr-skeleton')
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('width:180px')
      expect(html).toContain('height:24px')
    })

    it('#464 EmptyState renders icon, title, description and action', () => {
      const html = renderToStaticMarkup(
        <EmptyState
          title="No plugins found"
          description="Try refining your query or search term."
          action={<Button size="sm">Reset filters</Button>}
        />
      )
      expect(html).toContain('bmr-empty-state')
      expect(html).toContain('bmr-empty-state__title')
      expect(html).toContain('No plugins found')
      expect(html).toContain('bmr-empty-state__description')
      expect(html).toContain('Try refining your query')
      expect(html).toContain('Reset filters')
    })
  })
})
