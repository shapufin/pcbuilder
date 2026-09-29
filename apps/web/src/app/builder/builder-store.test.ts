import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilderStore } from './builder-store'

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
