'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useFormFields } from '@payloadcms/ui'
import { SPEC_TEMPLATES, specTemplateFor, type SpecFieldDef } from '@buildmyrig/plugin-pc-builder'
import { Cpu, RefreshCw, Check, Link2, Sparkles, AlertCircle } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  EmptyState,
  Switch,
  useToast,
} from '../ui'

type SpecsRecord = Record<string, unknown>

interface CategoryDoc {
  id: string | number
  title?: string
  slug?: string
}

interface ComponentDoc {
  id: string | number
  name?: string
  specsJson?: SpecsRecord | null
}

const CATEGORY_TEMPLATE_OPTIONS = [
  { value: 'cpu', label: 'CPU (Processor)' },
  { value: 'motherboard', label: 'Motherboard' },
  { value: 'ram', label: 'RAM (Memory)' },
  { value: 'gpu', label: 'GPU (Graphics Card)' },
  { value: 'storage', label: 'Storage (SSD / NVMe)' },
  { value: 'psu', label: 'PSU (Power Supply)' },
  { value: 'case', label: 'PC Case' },
  { value: 'cooling', label: 'CPU Cooling' },
  { value: 'case-fan', label: 'Case Fans' },
]

function normalizeCategorySlug(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (lower === 'cpu' || lower === 'processors' || lower.includes('processor')) return 'cpu'
  if (lower === 'motherboards' || lower === 'motherboard' || lower.includes('motherboard')) return 'motherboard'
  if (lower === 'ram' || lower === 'memory') return 'ram'
  if (lower === 'gpus' || lower === 'gpu' || lower.includes('graphic')) return 'gpu'
  if (lower === 'storage' || lower === 'ssd' || lower.includes('drive')) return 'storage'
  if (lower === 'psus' || lower === 'psu' || lower.includes('power')) return 'psu'
  if (lower === 'cases' || lower === 'case' || lower.includes('chassis')) return 'case'
  if (lower === 'cooling' || lower === 'cooler' || lower.includes('cooler')) return 'cooling'
  if (lower === 'case-fan' || lower.includes('fan')) return 'case-fan'
  return lower
}

function extractRelationId(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return extractRelationId(value[0])
  }
  if (typeof value === 'object' && 'id' in value) {
    return (value as { id: string | number }).id
  }
  return null
}

export const ProductSpecFields: React.FC = () => {
  const { dispatchFields } = useForm()
  const dispatchField = dispatchFields as unknown as ((args: { type: string; path: string; value: unknown }) => void) | undefined

  const [specsJsonField, categoryField, componentField] = useFormFields(([fields]) => [
    fields?.specsJson,
    fields?.category,
    fields?.component,
  ])

  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>('')
  const [linkedComponent, setLinkedComponent] = useState<ComponentDoc | null>(null)
  const [copiedSuccess, setCopiedSuccess] = useState(false)
  const { toast } = useToast()

  const categoryId = extractRelationId(categoryField?.value)
  const componentId = extractRelationId(componentField?.value)

  useEffect(() => {
    let active = true
    fetch('/api/categories?limit=100&depth=0')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.docs) {
          setCategories(data.docs)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!componentId) return
    let active = true
    fetch(`/api/components/${componentId}?depth=0`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setLinkedComponent(data)
        }
      })
      .catch(() => {
        if (active) setLinkedComponent(null)
      })
    return () => {
      active = false
    }
  }, [componentId])

  const activeLinkedComponent = componentId ? linkedComponent : null


  const detectedCategorySlug = useMemo(() => {
    if (categoryId == null) return null
    const doc = categories.find((c) => String(c.id) === String(categoryId))
    if (!doc?.slug) return null
    return normalizeCategorySlug(doc.slug)
  }, [categories, categoryId])

  const activeTemplateSlug = useMemo(() => {
    if (selectedTemplateSlug) return selectedTemplateSlug
    if (detectedCategorySlug && detectedCategorySlug in SPEC_TEMPLATES) {
      return detectedCategorySlug
    }
    return null
  }, [selectedTemplateSlug, detectedCategorySlug])

  const template = useMemo<SpecFieldDef[]>(() => {
    if (!activeTemplateSlug) return []
    return specTemplateFor(activeTemplateSlug)
  }, [activeTemplateSlug])

  const specs: SpecsRecord = useMemo(() => {
    const raw = specsJsonField?.value
    if (raw == null) return {}
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as SpecsRecord
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as SpecsRecord
        }
      } catch {}
    }
    return {}
  }, [specsJsonField?.value])

  const write = (key: string, value: unknown) => {
    const next: SpecsRecord = { ...specs }
    if (value === undefined || value === '') {
      delete next[key]
    } else {
      next[key] = value
    }
    if (typeof dispatchField === 'function') {
      dispatchField({
        type: 'UPDATE',
        path: 'specsJson',
        value: next,
      })
    }
  }

  const handleCopyFromComponent = () => {
    if (!activeLinkedComponent?.specsJson) return
    const merged: SpecsRecord = { ...specs, ...activeLinkedComponent.specsJson }
    if (typeof dispatchField === 'function') {
      dispatchField({
        type: 'UPDATE',
        path: 'specsJson',
        value: merged,
      })
    }
    setCopiedSuccess(true)
    toast({
      title: 'Specs Synchronized',
      description: 'Copied specifications from linked PC builder component.',
      variant: 'success',
    })
    setTimeout(() => setCopiedSuccess(false), 2500)
  }

  const renderInput = (f: SpecFieldDef) => {
    const value = specs[f.key]
    switch (f.type) {
      case 'number':
        return (
          <div className="bmr-spec-fields__input-unit">
            <input
              type="number"
              value={value == null ? '' : String(value)}
              onChange={(e) => write(f.key, e.target.value === '' ? undefined : Number(e.target.value))}
              className="bmr-spec-fields__input"
            />
            {f.unit && <span className="bmr-spec-fields__unit">{f.unit}</span>}
          </div>
        )
      case 'boolean':
        return (
          <div className="bmr-spec-fields__switch-row">
            <Switch
              checked={value === true}
              onCheckedChange={(checked) => write(f.key, checked ? true : undefined)}
              label="Enabled"
            />
          </div>
        )
      case 'select':
        return (
          <select
            value={value == null ? '' : String(value)}
            onChange={(e) => write(f.key, e.target.value === '' ? undefined : e.target.value)}
            className="bmr-spec-fields__select"
          >
            <option value="">— Select —</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )
      default:
        return (
          <input
            type="text"
            value={value == null ? '' : String(value)}
            onChange={(e) => write(f.key, e.target.value === '' ? undefined : e.target.value)}
            className="bmr-spec-fields__input"
          />
        )
    }
  }

  return (
    <Card className="bmr-spec-fields">
      {/* Header bar */}
      <CardHeader className="bmr-spec-fields__header">
        <div className="bmr-spec-fields__title-group">
          <Cpu size={18} className="bmr-spec-fields__icon" />
          <CardTitle className="bmr-spec-fields__title">Category Specifications Template</CardTitle>
          <Badge variant={activeTemplateSlug ? 'default' : 'muted'}>
            {activeTemplateSlug ? activeTemplateSlug.toUpperCase() : 'NO TEMPLATE'}
          </Badge>
        </div>

        {/* Template selector */}
        <div className="bmr-spec-fields__template-box">
          <label className="bmr-spec-fields__template-label">Template:</label>
          <select
            value={selectedTemplateSlug || activeTemplateSlug || ''}
            onChange={(e) => setSelectedTemplateSlug(e.target.value)}
            className="bmr-spec-fields__template-select"
            aria-label="Specifications Template Selector"
          >
            <option value="">— Auto-Detect from Category —</option>
            {CATEGORY_TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Linked Builder Component Banner */}
        {componentId && (
          <div className="bmr-spec-fields__linked-banner">
            <div className="bmr-spec-fields__linked-info">
              <Link2 size={16} className="bmr-spec-fields__linked-icon" />
              <span>Linked to PC Builder Component:</span>
              <strong className="bmr-spec-fields__linked-component">
                {linkedComponent?.name || `Component #${componentId}`}
              </strong>
            </div>

            {linkedComponent?.specsJson && Object.keys(linkedComponent.specsJson).length > 0 && (
              <Button
                variant={copiedSuccess ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleCopyFromComponent}
              >
                {copiedSuccess ? <Check size={12} /> : <RefreshCw size={12} />}
                <span>{copiedSuccess ? 'Specs Copied!' : 'Copy Specs from Component'}</span>
              </Button>
            )}
          </div>
        )}

        {/* Template Fields Grid */}
        {template.length === 0 ? (
          <EmptyState
            icon={<AlertCircle size={18} />}
            title="No Spec Template Loaded"
            description={
              categoryId == null
                ? 'Assign a Category in the sidebar or pick a Template above to load tailored spec inputs.'
                : 'This category does not have a predefined hardware spec template. Use raw JSON or choose a template above.'
            }
          />
        ) : (
          <div className="bmr-spec-fields__grid">
            {template.map((f) => (
              <div key={f.key} className="bmr-spec-fields__field">
                <label className="bmr-spec-fields__label">{f.label}</label>
                {renderInput(f)}
              </div>
            ))}
          </div>
        )}

        <div className="bmr-spec-fields__footer-note">
          <Sparkles size={12} className="bmr-spec-fields__sparkle" />
          <span>
            Values saved here write directly into the product&#39;s specifications and feed the PDP table &amp; builder chips.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductSpecFields
