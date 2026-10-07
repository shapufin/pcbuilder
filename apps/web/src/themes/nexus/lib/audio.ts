// Nexus haptic audio — ported from shop layout/src/utils/audio.ts (entry 71).
// Web Audio only; every player fails silently when the context is blocked or
// sound is disabled. The enabled flag persists in localStorage('bmr_sound')
// and is owned by NexusSoundToggle — this module just reads it lazily.

let audioCtx: AudioContext | null = null

export const SOUND_STORAGE_KEY = 'bmr_sound'

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Default ON — same as the source app; the toggle writes '0' to disable.
    return localStorage.getItem(SOUND_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // private mode — sounds still honour the in-memory call sites' reads
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) audioCtx = new Ctor()
    }
    if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

/** Gentle crisp tick for UI navigation. */
export function playTickSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.04)
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  } catch {
    // silent fail
  }
}

/** Mechanical latch/snap when an explorer component mounts. */
export function playMountSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(220, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12)
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(950, ctx.currentTime)
    osc2.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)
    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.12)
    osc2.stop(ctx.currentTime + 0.12)
  } catch {
    // silent fail
  }
}

/** Sparkle / electrical discharge burst (slot explorer). */
export function playSparkleSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const pitches = [1800, 2400, 3200, 4100]
    pitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = ctx.currentTime + idx * 0.03
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, startTime + 0.06)
      gain.gain.setValueAtTime(0.05, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.06)
    })
  } catch {
    // silent fail
  }
}

/** Success chime (add-to-cart / mount-all / order confirmation). */
export function playSuccessSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = ctx.currentTime + i * 0.07
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.08, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.25)
    })
  } catch {
    // silent fail
  }
}
