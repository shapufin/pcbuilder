'use client'

import React, { useState } from 'react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Textarea,
  Checkbox,
  Switch,
  MetricCard,
  AlertBanner,
  FilterPills,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui'
import {
  Layers,
  MousePointerClick,
  ShieldCheck,
  Table2,
  FormInput,
  Activity,
  Check,
  Copy,
  Package,
} from 'lucide-react'

type SectionId = 'all' | 'buttons' | 'badges' | 'forms' | 'tables' | 'feedback'

const SECTION_PILLS = [
  { id: 'all', label: 'All Primitives' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'badges', label: 'Badges' },
  { id: 'forms', label: 'Forms' },
  { id: 'tables', label: 'Tables' },
  { id: 'feedback', label: 'Feedback' },
]

const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'subtle',
  'link',
] as const

const BADGE_VARIANTS = [
  { variant: 'success', label: 'Published' },
  { variant: 'warning', label: 'Draft' },
  { variant: 'destructive', label: 'Failed' },
  { variant: 'info', label: 'Live Matrix' },
  { variant: 'muted', label: 'Archived' },
  { variant: 'outline', label: 'Enforced' },
  { variant: 'subtle', label: 'Advisory' },
] as const

const SectionCard: React.FC<{
  index: string
  title: string
  spec: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  children: React.ReactNode
}> = ({ index, title, spec, icon: Icon, children }) => (
  <Card className="bmr-ds-section">
    <CardHeader className="bmr-ds-section__head">
      <div className="bmr-ds-section__title-wrap">
        <Icon className="bmr-ds-section__icon" size={18} />
        <CardTitle className="bmr-ds-section__title">
          {index}. {title}
        </CardTitle>
      </div>
      <CardDescription className="bmr-ds-section__spec">{spec}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
)

const CopyBtn: React.FC<{
  code: string
  id: string
  copied: boolean
  onCopy: (code: string, id: string) => void
}> = ({ code, id, copied, onCopy }) => (
  <button
    type="button"
    className="bmr-ds-copy"
    onClick={() => onCopy(code, id)}
  >
    {copied ? <Check size={12} /> : <Copy size={12} />}
    {copied ? 'Copied JSX' : 'Copy JSX'}
  </button>
)

/**
 * UI Standards & Form Spec — canonical registry of the `admin/ui` primitive
 * library (AdminGUI mockup "Design System" parity). Every section renders the
 * real bmr-* primitives so visual regressions surface immediately.
 */
export const DesignSystemView: React.FC = () => {
  const [section, setSection] = useState<SectionId>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [demoCheck, setDemoCheck] = useState(true)
  const [demoSwitch, setDemoSwitch] = useState(true)
  const [demoInput, setDemoInput] = useState('ASUS ROG Strix RTX 4080 Super')

  const show = (id: SectionId) => section === 'all' || section === id

  const copySnippet = (code: string, id: string) => {
    void navigator.clipboard?.writeText(code).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyProps = (code: string, id: string) => ({
    code,
    id,
    copied: copiedId === id,
    onCopy: copySnippet,
  })

  return (
    <div className="bmr-ds-view">
      {/* Header */}
      <div className="bmr-collection-header">
        <div className="bmr-collection-header__top">
          <div className="bmr-collection-header__title-group">
            <div className="bmr-collection-header__title-wrap">
              <h1 className="bmr-collection-header__title">
                UI Standards &amp; Form Spec
              </h1>
              <span className="bmr-badge bmr-badge--info">PAYLOAD 3.90 + REACT 19</span>
            </div>
            <p className="bmr-collection-header__subtitle">
              Canonical registry of the admin primitive library. Every control
              below renders the real <code>bmr-*</code> component — inherit these
              variants, spacing and interaction budgets when building new admin
              surfaces.
            </p>
            <span className="bmr-global-header__scope">System · Design System</span>
          </div>
        </div>
      </div>

      <FilterPills
        items={SECTION_PILLS}
        activeId={section}
        onChange={(id) => setSection(id as SectionId)}
      />

      {/* 1. Button System */}
      {show('buttons') && (
        <SectionCard
          index="1"
          title="Button Hierarchy & Interaction Budgets"
          spec="admin/ui/Button.tsx — cva variants, 150ms transitions, active scale micro-feedback"
          icon={MousePointerClick}
        >
          <div className="bmr-ds-row">
            {BUTTON_VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
            <Button variant="primary" loading>
              Processing…
            </Button>
          </div>
          <div className="bmr-ds-row">
            <Button variant="outline" size="sm">
              Small (32px)
            </Button>
            <Button variant="outline" size="md">
              Medium (36px)
            </Button>
            <Button variant="outline" size="lg">
              Large (44px)
            </Button>
            <Button variant="outline" size="icon" aria-label="Icon button">
              <Layers size={15} />
            </Button>
          </div>
          <CopyBtn {...copyProps(`<Button variant="primary" size="sm">Publish Changes</Button>`, 'btn')} />
        </SectionCard>
      )}

      {/* 2. Badges */}
      {show('badges') && (
        <SectionCard
          index="2"
          title="Status Badges (Zero-Pill Discipline)"
          spec="admin/ui/Badge.tsx — pills reserved for functional status; metadata stays unboxed"
          icon={ShieldCheck}
        >
          <div className="bmr-ds-row">
            {BADGE_VARIANTS.map((b) => (
              <Badge key={b.variant} variant={b.variant}>
                {b.label}
              </Badge>
            ))}
          </div>
          <div className="bmr-ds-row">
            <Badge variant="success" dot>
              Engine Online
            </Badge>
            <Badge variant="warning" dot pulse>
              Sync Pending
            </Badge>
            <Badge variant="destructive" dot>
              Conflict
            </Badge>
          </div>
          <CopyBtn {...copyProps(`<Badge variant="success" dot>Published</Badge>`, 'badge')} />
        </SectionCard>
      )}

      {/* 3. Form Controls */}
      {show('forms') && (
        <SectionCard
          index="3"
          title="Standard Form Controls"
          spec="admin/ui/Input.tsx · Textarea.tsx · Checkbox.tsx · Switch.tsx"
          icon={FormInput}
        >
          <div className="bmr-ds-grid">
            <div>
              <Input
                label="Standard Text Input"
                required
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Enter title…"
                helperText="Label (font-semibold) + required asterisk + hairline container."
              />
              <CopyBtn {...copyProps(`<Input label="Title" required value={v} onChange={setV} />`, 'input')} />
            </div>
            <div>
              <Input
                label="Validation Error State"
                required
                defaultValue="invalid--slug"
                error="Only lowercase alphanumeric characters and single hyphens allowed."
              />
            </div>
            <div>
              <Textarea
                label="Standard Textarea"
                defaultValue="Ada Lovelace architecture with ultra-fast GDDR6X memory and vapor chamber cooling."
                helperText="Vertical resize only; helper text renders below the field."
              />
            </div>
            <div className="bmr-ds-stack">
              <Checkbox
                checked={demoCheck}
                onChange={(e) => setDemoCheck(e.target.checked)}
                label="Enable variants — multi-SKU matrix with independent inventory"
              />
              <Switch
                checked={demoSwitch}
                onCheckedChange={setDemoSwitch}
                label="Live PC Builder Validation"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* 4. Table Standard */}
      {show('tables') && (
        <SectionCard
          index="4"
          title="High-Density Table & Grid Standard"
          spec="admin/ui/Table.tsx — uppercase 11px heads, numeric cells enforce font-variant-numeric: tabular-nums"
          icon={Table2}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ITEM TITLE</TableHead>
                <TableHead>CATEGORY</TableHead>
                <TableHead numeric>PRICE (EUR)</TableHead>
                <TableHead numeric>STOCK</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="bmr-ds-ta-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow selected>
                <TableCell>ASUS ROG Strix RTX 4080 Super</TableCell>
                <TableCell>GPUs</TableCell>
                <TableCell numeric>€1,189.00</TableCell>
                <TableCell numeric>14</TableCell>
                <TableCell>
                  <Badge variant="success">Published</Badge>
                </TableCell>
                <TableCell className="bmr-ds-ta-right">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>AMD Ryzen 7 7800X3D</TableCell>
                <TableCell>Processors</TableCell>
                <TableCell numeric>€419.00</TableCell>
                <TableCell numeric>28</TableCell>
                <TableCell>
                  <Badge variant="warning">Draft</Badge>
                </TableCell>
                <TableCell className="bmr-ds-ta-right">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {/* 5. Telemetry & Feedback */}
      {show('feedback') && (
        <SectionCard
          index="5"
          title="Telemetry Cards & Operational Banners"
          spec="admin/ui/MetricCard.tsx · AlertBanner.tsx — KPI ribbons + severity alerts"
          icon={Activity}
        >
          <div className="bmr-ds-grid bmr-ds-grid--4">
            <MetricCard label="TOTAL PRODUCTS" value={52} subtext="catalog items" icon={Package} />
            <MetricCard
              label="RULE ENGINE"
              value="100%"
              subtext="14 rules active"
              trend={{ direction: 'up', label: 'enforced' }}
              icon={ShieldCheck}
            />
            <MetricCard label="CUSTOM BUILDS" value={36} subtext="28 in cart" icon={Layers} />
            <MetricCard
              label="CONVERSION"
              value="98.6%"
              subtext="preset attach rate"
              trend={{ direction: 'up', label: '+4.2%' }}
              icon={Activity}
            />
          </div>
          <div className="bmr-ds-stack">
            <AlertBanner
              severity="info"
              title="Taxonomy Drives Storefront Filters"
              description="Info banners document operational invariants — category structure feeds facets and the mega menu."
            />
            <AlertBanner
              severity="warning"
              title="Low Stock Alert"
              description="Warnings carry an actionable operational claim — reorder before builder checkout stalls."
            />
            <AlertBanner
              severity="critical"
              title="Settlement Webhook Failing"
              description="Critical banners flag broken pipelines requiring immediate attention."
            />
            <AlertBanner
              severity="success"
              title="Rule Engine Synchronized"
              description="Success banners confirm healthy subsystems."
            />
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export default DesignSystemView
