import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RGB_ACCENT } from '@buildmyrig/lib'
import { builderDraftMerge, builderDraftPartialize, useBuilderStore } from './builder-store'

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

/**
 * Entry-55 review: phantom ids from stale drafts/templates, named-draft refs,
 * and tampered persisted colors.
 */
describe('builder store — saved refs, prune, merge', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      mode: 'scratch',
      templateId: null,
      buildId: null,
      shareId: null,
      buildName: null,
      selections: {},
      rgbColor: DEFAULT_RGB_ACCENT,
      stepIndex: 0,
      query: '',
      brand: null,
    })
  })

  it('#375 saveBuild stores the name; every invalidation clears it', () => {
    const s = useBuilderStore.getState()
    s.saveBuild('b1', 'sh1', 'My rig')
    let now = useBuilderStore.getState()
    expect(now.buildName).toBe('My rig')
    s.toggleSelect('cpu', 'c1', 1)
    now = useBuilderStore.getState()
    expect(now.buildId).toBeNull()
    expect(now.buildName).toBeNull()

    useBuilderStore.getState().saveBuild('b2', 'sh2', 'Named')
    useBuilderStore.getState().clearSavedBuild()
    now = useBuilderStore.getState()
    expect(now.buildId).toBeNull()
    expect(now.shareId).toBeNull()
    expect(now.buildName).toBeNull()
    expect(builderDraftPartialize(now).buildName).toBeNull()
  })

  it('#376 pruneUnknown drops dead component ids and invalidates the draft', () => {
    const s = useBuilderStore.getState()
    s.saveBuild('b1', 'sh1')
    useBuilderStore.setState({
      selections: { cpu: ['c1', 'ghost'], ram: ['dead'], storage: [] },
    })
    useBuilderStore.getState().pruneUnknown(new Set(['c1']))
    const now = useBuilderStore.getState()
    expect(now.selections).toEqual({ cpu: ['c1'] })
    expect(now.buildId).toBeNull()
    expect(now.shareId).toBeNull()

    // No-op when everything resolves — refs stay.
    useBuilderStore.getState().saveBuild('b2', 'sh2')
    useBuilderStore.getState().pruneUnknown(new Set(['c1']))
    expect(useBuilderStore.getState().buildId).toBe('b2')
  })

  it('#377 persisted merge re-validates rgbColor (tampered draft → default)', () => {
    // zustand persist merge runs on rehydrate — exercised directly since the
    // node test env has no localStorage.
    expect(builderDraftMerge({ rgbColor: 'rosso' }, useBuilderStore.getState()).rgbColor).toBe(
      DEFAULT_RGB_ACCENT,
    )
    expect(builderDraftMerge({ rgbColor: '#7df4ff' }, useBuilderStore.getState()).rgbColor).toBe(
      '#7df4ff',
    )
    // missing key → default (a draft without a color gets the default accent)
    expect(builderDraftMerge({}, useBuilderStore.getState()).rgbColor).toBe(DEFAULT_RGB_ACCENT)
  })

  it('#381 merge sanitizes malformed selections + clears refs that no longer match', () => {
    const current = useBuilderStore.getState()
    // Tampered draft: a string where an array belongs used to crash
    // pruneUnknown's ids.filter on every mount (entry-55 review M3).
    const merged = builderDraftMerge(
      {
        selections: { cpu: 'not-an-array', ram: ['r1', 42, 'r2'], gpu: ['g1'] },
        buildId: { bad: true },
        shareId: 'sh-ok',
        buildName: 7,
        mode: 'bogus',
        stepIndex: 1.5,
      },
      current,
    )
    expect(merged.selections).toEqual({ ram: ['r1', 'r2'], gpu: ['g1'] })
    // dropped entries invalidate the saved refs (they describe another draft)
    expect(merged.buildId).toBeNull()
    expect(merged.shareId).toBeNull()
    expect(merged.buildName).toBeNull()
    expect(merged.mode).toBe('scratch')
    expect(merged.stepIndex).toBe(0)

    // clean draft keeps its refs and valid fields
    const clean = builderDraftMerge(
      {
        selections: { cpu: ['c1'] },
        buildId: 9,
        shareId: 'sh-ok',
        buildName: 'Rig',
        mode: 'guided',
        stepIndex: 3,
      },
      current,
    )
    expect(clean.selections).toEqual({ cpu: ['c1'] })
    expect(clean.buildId).toBe('9')
    expect(clean.shareId).toBe('sh-ok')
    expect(clean.buildName).toBe('Rig')
    expect(clean.mode).toBe('guided')
    expect(clean.stepIndex).toBe(3)
  })

  it('#437 path persists through partialize/merge, resets on fresh/template', () => {
    useBuilderStore.getState().setPath('amd')
    expect(useBuilderStore.getState().path).toBe('amd')
    expect(builderDraftPartialize(useBuilderStore.getState()).path).toBe('amd')

    // merge accepts a valid path, rejects garbage
    expect(builderDraftMerge({ path: 'intel' }, useBuilderStore.getState()).path).toBe('intel')
    expect(builderDraftMerge({ path: 'risc-v' }, useBuilderStore.getState()).path).toBeNull()
    expect(builderDraftMerge({}, useBuilderStore.getState()).path).toBeNull()

    // startFresh clears it (no stale platform leaking into a new build)
    useBuilderStore.getState().setPath('amd')
    useBuilderStore.getState().startFresh()
    expect(useBuilderStore.getState().path).toBeNull()

    // applyTemplate clears it — the provider re-infers from restored selections
    useBuilderStore.getState().setPath('intel')
    useBuilderStore.getState().applyTemplate('t1', [{ categoryId: 'cpu', componentId: 'c1' }])
    expect(useBuilderStore.getState().path).toBeNull()

    // path alone never invalidates the saved-draft refs (#93 scope)
    useBuilderStore.getState().saveBuild('b1', 'sh1')
    useBuilderStore.getState().setPath('amd')
    expect(useBuilderStore.getState().buildId).toBe('b1')
  })

  it('#382 a resolved cap of 0 rejects adds but still allows deselect', () => {
    const s = useBuilderStore.getState()
    s.toggleSelect('storage', 'd1', 0)
    expect(useBuilderStore.getState().selections.storage ?? []).toEqual([])
    // deselect path stays live for already-phantom picks
    useBuilderStore.setState({ selections: { storage: ['d1'] } })
    useBuilderStore.getState().toggleSelect('storage', 'd1', 0)
    expect(useBuilderStore.getState().selections.storage).toEqual([])
  })
})
