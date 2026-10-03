import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RGB_ACCENT } from '@buildmyrig/lib'
import { builderDraftPartialize, useBuilderStore } from './builder-store'

/**
 * Entry-15 review findings (#93–94): the server-persisted draft reference
 * (buildId/shareId) must be invalidated whenever the slots change — otherwise
 * the summary CTAs (save/claim/add-to-cart) keep operating on a stale build
 * doc whose slots no longer match what the user configured.
 */
describe('builder store — draft invalidation', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      mode: 'scratch',
      templateId: null,
      buildId: 'build-1',
      shareId: 'share-1',
      selections: { cpu: ['c1'], storage: [] },
      stepIndex: 0,
      query: '',
      brand: null,
    })
  })

  it('#93 selection mutations clear buildId/shareId (stale server draft)', () => {
    const s = useBuilderStore.getState()

    s.toggleSelect('storage', 'd1', 1)
    expect(useBuilderStore.getState().buildId).toBeNull()
    expect(useBuilderStore.getState().shareId).toBeNull()
    expect(useBuilderStore.getState().selections).toEqual({ cpu: ['c1'], storage: ['d1'] })

    useBuilderStore.setState({ buildId: 'build-2', shareId: 'share-2' })
    useBuilderStore.getState().removeComponent('cpu', 'c1')
    expect(useBuilderStore.getState().buildId).toBeNull()
    expect(useBuilderStore.getState().shareId).toBeNull()
    expect(useBuilderStore.getState().selections).toEqual({ cpu: [], storage: ['d1'] })

    useBuilderStore.setState({ buildId: 'build-3', shareId: 'share-3' })
    useBuilderStore.getState().clearSlot('storage')
    expect(useBuilderStore.getState().buildId).toBeNull()
    expect(useBuilderStore.getState().shareId).toBeNull()
    expect(useBuilderStore.getState().selections).toEqual({ cpu: [], storage: [] })
  })

  it('#94 non-selection actions keep the draft reference', () => {
    useBuilderStore.getState().goToStep(2)
    useBuilderStore.getState().setQuery('gpu')
    useBuilderStore.getState().setBrand('nvidia')
    useBuilderStore.getState().nextStep(5)
    useBuilderStore.getState().prevStep()

    const s = useBuilderStore.getState()
    expect(s.buildId).toBe('build-1')
    expect(s.shareId).toBe('share-1')
    expect(s.stepIndex).toBe(2)
    expect(s.query).toBe('gpu')
    expect(s.brand).toBe('nvidia')
  })
})

/**
 * Entry 50 P2 — rgbColor è cosmetico: persiste nella draft (partialize) ma
 * non è una selezione, quindi non deve invalidare il server draft (#93).
 * applyTemplate riceve l'accento dal doc (build/template) e lo ripristina;
 * senza parametro torna al default — niente bleed tra template.
 */
describe('builder store — rgbColor', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      mode: 'scratch',
      templateId: null,
      buildId: 'build-1',
      shareId: 'share-1',
      selections: { cpu: ['c1'] },
      rgbColor: '#a1b2c3',
      stepIndex: 0,
      query: '',
      brand: null,
    })
  })

  it('#320 setRgbColor persiste e non tocca buildId/shareId; hex invalidi respinti', () => {
    useBuilderStore.getState().setRgbColor('#38bdf8')
    let s = useBuilderStore.getState()
    expect(s.rgbColor).toBe('#38bdf8')
    expect(s.buildId).toBe('build-1')
    expect(s.shareId).toBe('share-1')

    // partialized: il colore entra nella draft persistita (node env non ha
    // localStorage — si verifica il contratto su partialize, non lo storage)
    expect(builderDraftPartialize(useBuilderStore.getState()).rgbColor).toBe('#38bdf8')

    for (const bad of ['#abc', 'notacolor', '#38bdf80', '38bdf8', '']) {
      useBuilderStore.getState().setRgbColor(bad)
    }
    s = useBuilderStore.getState()
    expect(s.rgbColor).toBe('#38bdf8')
    expect(s.buildId).toBe('build-1')
    expect(s.shareId).toBe('share-1')
  })

  it('#321 applyTemplate con rgbColor lo imposta, senza torna al default', () => {
    const slots = [{ categoryId: 'cpu', componentId: 'c2' }]
    useBuilderStore.getState().applyTemplate('t1', slots, 'template', '#fb923c')
    expect(useBuilderStore.getState().rgbColor).toBe('#fb923c')

    // template senza accento → default (un template non eredita il precedente)
    useBuilderStore.getState().applyTemplate('t2', slots)
    expect(useBuilderStore.getState().rgbColor).toBe(DEFAULT_RGB_ACCENT)

    // accento malformato dal doc → default, mai uno stato sporco
    useBuilderStore.getState().applyTemplate('t3', slots, 'template', 'rosso')
    expect(useBuilderStore.getState().rgbColor).toBe(DEFAULT_RGB_ACCENT)
  })

  it('#322 startFresh riporta rgbColor al default', () => {
    expect(useBuilderStore.getState().rgbColor).toBe('#a1b2c3')
    useBuilderStore.getState().startFresh()
    const s = useBuilderStore.getState()
    expect(s.rgbColor).toBe(DEFAULT_RGB_ACCENT)
    expect(s.selections).toEqual({})
    expect(s.buildId).toBeNull()
    expect(s.shareId).toBeNull()
  })
})
