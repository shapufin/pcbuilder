import type { BuilderIndex, ComponentSpecEntry, RuleDoc } from '@buildmyrig/lib'

/**
 * Auto-derived compatibility (spec §B): standard relations are synthesized from
 * typed spec fields at index-build time, so a component becomes correctly
 * constrained the moment its specs are filled — no authored rule required.
 *
 * Synthesized rows are ordinary RuleDocs — the engine is untouched. Authored
 * `compatibility-rules` still load and win on exact-key conflicts; per-product
 * specials (e.g. a case that cannot fit one specific GPU) stay authored.
 *
 * Direction policy: every relation emits explicit per-direction rows — the
 * engine's `bidirectional` flag is never set here. Its reverse mirror reuses
 * the forward message with a swapped componentA (garbled wording), and for
 * cross-field pairs like coolerSocketSupport the mirror is inert anyway.
 */

type CategorySlug = string

const catSlugById = (categories: BuilderIndex['categories']): Map<string, CategorySlug> =>
  new Map(categories.map((c) => [c.id, c.slug]))

const catIdBySlug = (categories: BuilderIndex['categories'], slug: CategorySlug): string | undefined =>
  categories.find((c) => c.slug === slug)?.id

interface Draft {
  subject: ComponentSpecEntry
  targetSlug: CategorySlug
  field: string
  operator: RuleDoc['operator']
  value: RuleDoc['value']
  message: string
}

/** Per-relation emission table. Each row knows which categories it applies to
 *  and which spec key gates it — a component only speaks when its spec exists. */
const draftsFor = (c: ComponentSpecEntry, slug: CategorySlug): Draft[] => {
  const s = c.specs
  const name = '{componentA}'
  const drafts: Draft[] = []

  // Socket-bearing parts constrain motherboards (and vice-versa below).
  if ((slug === 'cpu' || slug === 'motherboard') && s.socket) {
    if (slug === 'cpu') {
      drafts.push({
        subject: c, targetSlug: 'motherboard', field: 'socket', operator: 'equals', value: s.socket,
        message: `${name} uses socket ${s.socket} but the selected motherboard does not.`,
      })
      drafts.push({
        subject: c, targetSlug: 'cooling', field: 'coolerSocketSupport', operator: 'contains', value: s.socket,
        message: `${name} needs a cooler that supports ${s.socket}.`,
      })
    } else {
      drafts.push({
        subject: c, targetSlug: 'cpu', field: 'socket', operator: 'equals', value: s.socket,
        message: `${name} has an ${s.socket} socket but the selected CPU does not.`,
      })
      // Board socket also gates coolers — an LGA board dims AM5-only coolers.
      drafts.push({
        subject: c, targetSlug: 'cooling', field: 'coolerSocketSupport', operator: 'contains', value: s.socket,
        message: `${name} has an ${s.socket} socket — the selected cooler does not support it.`,
      })
    }
  }

  // Cooler-first direction (explicit rows — the engine's `bi` mirror cannot
  // compare cross-field, so a selected cooler would otherwise never dim
  // incompatible CPUs/boards): `socket in coolerSocketSupport`.
  if (slug === 'cooling' && s.coolerSocketSupport?.length) {
    drafts.push({
      subject: c, targetSlug: 'cpu', field: 'socket', operator: 'in', value: s.coolerSocketSupport,
      message: `${name} does not support this CPU's socket ({socket}).`,
    })
    drafts.push({
      subject: c, targetSlug: 'motherboard', field: 'socket', operator: 'in', value: s.coolerSocketSupport,
      message: `${name} does not support this motherboard's socket ({socket}).`,
    })
  }

  // RAM type is symmetric with the board.
  if (slug === 'ram' && s.ramType) {
    drafts.push({
      subject: c, targetSlug: 'motherboard', field: 'ramType', operator: 'equals', value: s.ramType,
      message: `${name} is ${s.ramType} but the selected motherboard only supports {ramType}.`,
    })
  }
  if (slug === 'motherboard' && s.ramType) {
    drafts.push({
      subject: c, targetSlug: 'ram', field: 'ramType', operator: 'equals', value: s.ramType,
      message: `${name} supports ${s.ramType} only.`,
    })
  }

  // Form factor: board demands the case list it; case bounds the board.
  if (slug === 'motherboard' && s.moboFormFactor) {
    drafts.push({
      subject: c, targetSlug: 'case', field: 'caseSupportedFormFactors', operator: 'contains', value: s.moboFormFactor,
      message: `${name} is ${s.moboFormFactor} but the selected case does not fit ${s.moboFormFactor} boards.`,
    })
  }
  if (slug === 'case' && s.caseSupportedFormFactors?.length) {
    drafts.push({
      subject: c, targetSlug: 'motherboard', field: 'moboFormFactor', operator: 'in', value: s.caseSupportedFormFactors,
      message: `${name} does not fit {moboFormFactor} motherboards.`,
    })
  }

  // GPU length vs case clearance, both directions.
  if (slug === 'gpu' && typeof s.gpuLengthMm === 'number') {
    drafts.push({
      subject: c, targetSlug: 'case', field: 'caseGpuMaxLengthMm', operator: 'gte', value: s.gpuLengthMm,
      message: `${name} is ${s.gpuLengthMm}mm long; the selected case supports {caseGpuMaxLengthMm}mm.`,
    })
  }
  if (slug === 'case' && typeof s.caseGpuMaxLengthMm === 'number') {
    drafts.push({
      subject: c, targetSlug: 'gpu', field: 'gpuLengthMm', operator: 'lte', value: s.caseGpuMaxLengthMm,
      message: `${name} fits GPUs up to ${s.caseGpuMaxLengthMm}mm — this GPU is {gpuLengthMm}mm.`,
    })
  }

  // NVMe drives need an M.2/NVMe slot. SATA is deliberately NOT a requires —
  // 'storageInterface' on a board means "has NVMe"; a SATA drive is fine on any
  // board (the speed advisory stays an authored rule).
  if (slug === 'storage' && s.storageInterface === 'NVMe') {
    drafts.push({
      subject: c, targetSlug: 'motherboard', field: 'storageInterface', operator: 'equals', value: 'NVMe',
      message: `${name} is an NVMe drive; the selected motherboard lacks an NVMe slot.`,
    })
  }

  // NOT synthesized (see spec §B):
  // - pcieVersion: string values can't feed numeric gte/lte (pre-existing noise bug).
  // - psuWatts: global power envelope (derived-power-rules + checkPowerEnvelope).
  // - mobo→storage: "board lacks NVMe → block NVMe drives" is inexpressible —
  //   the absence of a flag can't carry a rule value.
  return drafts
}

const ruleKey = (r: RuleDoc): string =>
  [r.subject.kind, r.subject.id, r.target.kind, r.target.id, r.type, r.operator, r.field, JSON.stringify(r.value)].join('|')

/**
 * Synthesize standard compatibility rules from component spec fields.
 * Returns only the NEW rows — callers append them to the authored list.
 * A synthesized row is suppressed when an authored rule with the same
 * (subject, target, type, operator, field, value) key already exists.
 */
export const synthesizeCompatibilityRules = (
  components: ComponentSpecEntry[],
  categories: BuilderIndex['categories'],
  authored: RuleDoc[],
): RuleDoc[] => {
  const slugMap = catSlugById(categories)
  const authoredKeys = new Set(authored.map(ruleKey))
  const out: RuleDoc[] = []

  for (const c of components) {
    const slug = slugMap.get(c.categoryId)
    if (!slug) continue
    for (const d of draftsFor(c, slug)) {
      const targetId = catIdBySlug(categories, d.targetSlug)
      if (!targetId) continue
      const rule: RuleDoc = {
        id: `derived:${c.id}:${d.targetSlug}:${d.field}`,
        type: 'requires',
        operator: d.operator,
        field: d.field,
        value: d.value,
        severity: 'error',
        bidirectional: false,
        message: d.message,
        subject: { kind: 'component', id: c.id, name: c.display?.name },
        target: { kind: 'category', id: targetId },
      }
      if (authoredKeys.has(ruleKey(rule))) continue
      out.push(rule)
    }
  }
  return out
}
