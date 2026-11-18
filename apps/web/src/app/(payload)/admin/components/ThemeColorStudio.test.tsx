import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  ThemeColorStudio,
  COLOR_TOKENS,
  PRESET_PALETTES,
  syncColorsToPayloadForm,
} from './ThemeColorStudio.tsx'

type FormFieldsMap = Record<string, { value: unknown }>

let mockDispatchedActions: Array<{ type: string; path?: string; value?: unknown }> = []
let mockModifiedState = false

const MockFormContext = React.createContext<{
  dispatchFields: (action: { type: string; path: string; value: unknown }) => void
  setModified: (val: boolean) => void
}>({
  dispatchFields: (action) => {
    mockDispatchedActions.push(action)
  },
  setModified: (val) => {
    mockModifiedState = val
  },
})

type MockAction = { type: string; path?: string; value?: unknown }

const MockFormFieldsContext = React.createContext<
  [FormFieldsMap, (action: MockAction) => void]
>([{}, (action) => mockDispatchedActions.push(action)])

vi.mock('@payloadcms/ui', () => ({
  useForm: () => React.useContext(MockFormContext),
  useFormFields: <T,>(
    selector?: (
      ctx: [FormFieldsMap, (action: MockAction) => void],
    ) => T,
  ) => {
    const ctx = React.useContext(MockFormFieldsContext)
    return selector ? selector(ctx) : ctx
  },
}))

export const TestFormProvider: React.FC<{
  children: React.ReactNode
  initialFields?: Record<string, unknown>
}> = ({ children, initialFields = {} }) => {
  const [fields, setFields] = React.useState<FormFieldsMap>(() => {
    const state: FormFieldsMap = {}
    for (const [k, v] of Object.entries(initialFields)) {
      state[k] = { value: v }
    }
    return state
  })

  const dispatch = React.useCallback(
    (action: MockAction) => {
      mockDispatchedActions.push(action)
      if (action.type === 'UPDATE' && action.path) {
        setFields((prev) => ({
          ...prev,
          [action.path!]: { value: action.value },
        }))
      }
    },
    [],
  )

  const formValue = React.useMemo(
    () => ({
      dispatchFields: dispatch,
      setModified: (mod: boolean) => {
        mockModifiedState = mod
      },
    }),
    [dispatch],
  )

  const fieldsValue = React.useMemo<
    [FormFieldsMap, (action: MockAction) => void]
  >(() => [fields, dispatch], [fields, dispatch])

  return (
    <MockFormContext.Provider value={formValue}>
      <MockFormFieldsContext.Provider value={fieldsValue}>
        {children}
      </MockFormFieldsContext.Provider>
    </MockFormContext.Provider>
  )
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/globals/theme',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ThemeColorStudio (#650 - #654)', () => {
  it('#650 renders Interactive Color Studio title, badge, and sync button', () => {
    const html = renderToStaticMarkup(
      <TestFormProvider>
        <ThemeColorStudio />
      </TestFormProvider>
    )
    expect(html).toContain('Interactive Color Studio')
    expect(html).toContain('Visual Palette Customizer &amp; Dynamic Live Sandbox')
    expect(html).toContain('Sync to Document Form')
  })

  it('#651 renders token pickers for all defined color tokens with hex inputs and affects tags', () => {
    const html = renderToStaticMarkup(
      <TestFormProvider>
        <ThemeColorStudio />
      </TestFormProvider>
    )
    for (const token of COLOR_TOKENS) {
      expect(html).toContain(token.cssVar)
      expect(html).toContain(token.label.replace('&', '&amp;'))
      expect(html).toContain(token.affects.replace('&', '&amp;'))
    }
  })

  it('#652 renders all preset palette pills with names and swatches', () => {
    const html = renderToStaticMarkup(
      <TestFormProvider>
        <ThemeColorStudio />
      </TestFormProvider>
    )
    for (const preset of PRESET_PALETTES) {
      expect(html).toContain(preset.name)
    }
    expect(html).toContain('Precision Dark')
    expect(html).toContain('Aether Foundry')
    expect(html).toContain('Titanium Frost')
    expect(html).toContain('Cyber Neon')
  })

  it('#653 renders Dynamic Live Example Sandbox with reactive elements', () => {
    const html = renderToStaticMarkup(
      <TestFormProvider>
        <ThemeColorStudio />
      </TestFormProvider>
    )
    expect(html).toContain('Dynamic Live Example Sandbox')
    expect(html).toContain('Live Reactive')
    expect(html).toContain('Precision Rig Preview')
    expect(html).toContain('Aether Workstation X-700')
    expect(html).toContain('Primary CTA Button')
    expect(html).toContain('Secondary Option')
    expect(html).toContain('In Stock (12 units)')
    expect(html).toContain('Power Limit: 850W')
  })

  it('#654 color sync dispatches into Payload form context and sets modified without page reload', () => {
    mockDispatchedActions = []
    mockModifiedState = false

    const customColors = {
      primary: '#ff5500',
      bg: '#050505',
    }

    const mockDispatch = vi.fn(
      (action: { type: string; path?: string; value?: unknown }) => {
        mockDispatchedActions.push(action)
      },
    )
    const mockSetModified = vi.fn((val: boolean) => {
      mockModifiedState = val
    })

    const count = syncColorsToPayloadForm(customColors, mockDispatch, mockSetModified)

    expect(count).toBe(2)
    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE',
      path: 'colors.primary',
      value: '#ff5500',
    })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE',
      path: 'colors.bg',
      value: '#050505',
    })
    expect(mockSetModified).toHaveBeenCalledWith(true)
    expect(mockModifiedState).toBe(true)

    // Form provider renders with these updated tokens without page reload
    const html = renderToStaticMarkup(
      <TestFormProvider initialFields={{ 'colors.primary': '#ff5500', 'colors.bg': '#050505' }}>
        <ThemeColorStudio />
      </TestFormProvider>
    )
    expect(html).toContain('Interactive Color Studio')
    expect(html).toContain('value="#ff5500"')
    expect(html).toContain('value="#050505"')
  })
})
