import {
  attributeDefs,
  attributeTypeNames,
  buildTemplateDefs,
  productDefs,
  rules,
  slotCategoryDefs,
} from './seed-data.ts'

const seed = async (): Promise<void> => {
  const { getPayload } = await import('payload')
  const config = await (await import('./payload.config.ts')).default
  const payload = await getPayload({ config })
  payload.logger.info('Seeding BuildMyRig data...')

  // Idempotency guard: re-running on a seeded DB dies on unique
  // constraints (users.email, slugs). Skip cleanly instead — to reseed,
  // delete the dev DB and restart `pnpm dev`.
  const existing = await payload.find({ collection: 'users', limit: 1 })
  if (existing.totalDocs > 0) {
    payload.logger.info('Seed skipped — database already seeded (users exist).')
    return
  }

  // ---- Users ----
  const admin = await payload.create({
    collection: 'users',
    data: { email: 'admin@buildmyrig.test', password: 'Password123!', roles: ['admin'] },
  })
  await payload.create({
    collection: 'users',
    data: { email: 'manager@buildmyrig.test', password: 'Password123!', roles: ['manager'] },
  })
  await payload.create({
    collection: 'users',
    data: { email: 'staff@buildmyrig.test', password: 'Password123!', roles: ['staff'] },
  })
  // Spec: 1 admin, 1 manager, 1 staff, 1 customer (C6).
  await payload.create({
    collection: 'users',
    data: { email: 'customer@buildmyrig.test', password: 'Password123!', roles: ['customer'] },
  })
  payload.logger.info(`admin user: ${admin.email}`)

  // ---- Categories ----
  const categoryNames = [
    'CPU', 'Motherboards', 'RAM', 'GPUs', 'Storage', 'PSUs',
    'Cases', 'Cooling', 'Peripherals', 'Monitors', 'OS',
    // Entry 71: turnkey systems (Nexus prebuilt tiers).
    'Pre-Built Rigs',
  ]
  const categories: Record<string, { id: number | string }> = {}
  for (const name of categoryNames) {
    categories[name] = await payload.create({
      collection: 'categories',
      data: { title: name, slug: name.toLowerCase().replace(/\s+/g, '-'), _status: 'published' },
    })
  }

  // ---- Brands ----
  const brandNames = ['Intel', 'AMD', 'NVIDIA', 'ASUS', 'Corsair', 'Samsung', 'Microsoft', 'BuildMyRig']
  const brands: Record<string, { id: number | string }> = {}
  for (const name of brandNames) {
    brands[name] = await payload.create({
      collection: 'brands',
      data: { name, slug: name.toLowerCase() },
    })
  }

  // ---- Attribute types + values ----
  const attributeValues: Record<string, { id: number | string }> = {}
  const attributeTypes: Record<string, { id: number | string }> = {}
  for (const [slug, valueType, unit, values] of attributeDefs) {
    const attrType = await payload.create({
      collection: 'attribute-types',
      data: { name: attributeTypeNames[slug] ?? slug, slug, valueType, unit: unit ?? undefined },
    })
    attributeTypes[slug] = attrType
    for (const v of values) {
      attributeValues[`${slug}:${v}`] = await payload.create({
        collection: 'attribute-values',
        data: { attributeType: attrType.id, value: v },
      })
    }
  }

  // ---- Media (C6: generated flat token-coloured placeholders) ----
  // 64×64 solid PNGs built from the brand tokens; not artwork, just a real
  // upload so product galleries / alt text have something to render.
  const placeholderPngs = [
    { name: 'placeholder-indigo.png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAe0lEQVR4nO3PQQ0AIBDAsFPHF/8C8IEIHg3JkgnoZq/zdcMFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjx2ATb0oVosXmJbAAAAAElFTkSuQmCC' },
    { name: 'placeholder-slate.png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAe0lEQVR4nO3PQQ0AIBDAsFPCHw3494UIHg3JkgnoZu3zdcMFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjx2Ad0DIHl8LgsNAAAAAElFTkSuQmCC' },
  ]
  const placeholderMedia: Array<{ id: number | string }> = []
  for (const png of placeholderPngs) {
    const data = Buffer.from(png.base64, 'base64')
    const media = await payload.create({
      collection: 'media',
      data: { alt: `BuildMyRig placeholder (${png.name.replace(/^placeholder-|\.png$/g, '')})` },
      file: { data, mimetype: 'image/png', name: png.name, size: data.length },
    } as never)
    placeholderMedia.push({ id: media.id })
  }

  // Entry 71: bundled Nexus hero renders (copied out of the gitignored
  // `shop layout/` source into src/seed-assets) upgrade the matching
  // products' galleries to real imagery. Read via import.meta.url so the
  // path is cwd-independent (payload run vs turbo task).
  const NEXUS_MEDIA: Record<string, { file: string; alt: string }> = {
    'NVIDIA RTX 4080 Super': { file: 'pc_component_gpu_rtx4090_1791190873608.jpg', alt: 'NVIDIA flagship GPU render' },
    'Intel Core i7-14700K': { file: 'pc_component_intel_cpu_delidded_1791190893683.jpg', alt: 'Delidded Intel CPU render' },
    'Corsair H150i Elite': { file: 'pc_component_liquid_aio_cooler_1791190882891.jpg', alt: 'Liquid AIO cooler render' },
    'Nexus Three — Lab Node': { file: 'pc_workstation_chassis_render_1791190862598.jpg', alt: 'Workstation chassis render' },
  }
  const nexusMedia: Record<string, number | string> = {}
  {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { join } = await import('node:path')
    const assetsDir = fileURLToPath(new URL('./seed-assets/', import.meta.url))
    for (const [title, meta] of Object.entries(NEXUS_MEDIA)) {
      try {
        const data = readFileSync(join(assetsDir, meta.file))
        const media = await payload.create({
          collection: 'media',
          data: { alt: meta.alt },
          file: { data, mimetype: 'image/jpeg', name: meta.file, size: data.length },
        } as never)
        nexusMedia[title] = media.id
      } catch {
        // Asset missing — the product keeps its placeholder image.
      }
    }
  }

  // ---- Component categories (builder slots) ----
  const slotCategories: Record<string, { id: number | string }> = {}
  for (const def of slotCategoryDefs) {
    slotCategories[def.slug] = await payload.create({ collection: 'component-categories', data: def })
  }

  // ---- Products + variants + components ----
  const productByTitle: Record<string, { id: number | string; price: number }> = {}
  const variantByTitle: Record<string, { id: number | string }> = {}
  const componentByTitle: Record<string, { id: number | string }> = {}

  for (const [index, def] of productDefs.entries()) {
    const attrs = Object.entries(def.attrs ?? {})
      .map(([slug, value]) => {
        const valueDoc = attributeValues[`${slug}:${value}`]
        const typeDoc = attributeTypes[slug]
        if (!valueDoc || !typeDoc) return null
        return { attributeType: typeDoc.id, value: valueDoc.id }
      })
      .filter((a): a is { attributeType: number | string; value: number | string } => a !== null)
    const product = await payload.create({
      collection: 'products',
      draft: false,
      data: {
        title: def.title,
        slug: def.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        category: categories[def.category].id,
        brand: brands[def.brand].id,
        description: `${def.title} — seeded demo product.`,
        priceInEUREnabled: true,
        priceInEUR: def.price,
        // C6: every product gets a gallery image + its typed attrs; entry 71
        // swaps in the real Nexus render for the four mapped titles.
        gallery: [
          nexusMedia[def.title] ??
            // If BOTH placeholder creates failed, skip the gallery rather
            // than crash on index % 0.
            placeholderMedia[index % placeholderMedia.length]?.id,
        ].filter((id): id is number | string => id != null),
        ...(attrs.length > 0 ? { attributeValues: attrs } : {}),
        // Entry 71: product-level specsJson feeds the PDP spec table AND the
        // Nexus meta chips (specMeta helper). Previously never seeded →
        // fresh-DB PDPs showed "No specs listed." (gap register #8).
        ...(def.specs ? { specsJson: def.specs } : {}),
        _status: 'published',
      } as never,
    })
    productByTitle[def.title] = { id: product.id, price: def.price }

    const variantType = await payload.create({
      collection: 'variantTypes',
      data: { label: 'Model', name: 'model' },
    })
    const variantOption = await payload.create({
      collection: 'variantOptions',
      data: { variantType: variantType.id, label: 'Standard', value: 'standard' },
    })
    const variant = await payload.create({
      collection: 'variants',
      draft: false,
      data: {
        title: `${def.title} (default)`,
        product: product.id,
        options: [variantOption.id],
        priceInEUREnabled: true,
        priceInEUR: def.price,
        // Pass-1 audit: field was never seeded → every storefront product
        // truthfully read "Out of stock". 25 gives the demo in-stock signal;
        // the OOS path stays exercisable via the admin.
        inventory: 25,
      } as never,
    })
    variantByTitle[def.title] = variant

    if (def.builder) {
      const component = await payload.create({
        collection: 'components',
        data: {
          name: def.title,
          productVariant: variant.id,
          category: slotCategories[def.builder.cat].id,
          brand: brands[def.brand].id,
          description: `${def.title} — builder component.`,
          isOsLicense: def.builder.cat === 'os',
          ...def.builder.spec,
        } as never,
      })
      componentByTitle[def.title] = component
    }
  }

  // ---- Compatibility rules ----
  let ruleCount = 0
  for (const r of rules) {
    await payload.create({
      collection: 'compatibility-rules',
      data: {
        subjectType: r.st,
        subjectComponent: r.st === 'component' ? componentByTitle[r.s].id : undefined,
        subjectCategory: r.st === 'category' ? slotCategories[r.s].id : undefined,
        targetType: r.t ? 'component' : 'category',
        targetComponent: r.t ? componentByTitle[r.t].id : undefined,
        targetCategory: slotCategories[r.tCat].id,
        type: r.type,
        operator: r.op,
        field: r.field,
        value: String(r.value),
        severity: r.severity ?? (r.type === 'warns' ? 'warning' : 'error'),
        bidirectional: r.bi ?? false,
        message: r.msg,
        enabled: true,
      } as never,
    })
    ruleCount++
  }

  // ---- Derived power rule ----
  await payload.create({
    collection: 'derived-power-rules',
    data: {
      targetCategory: slotCategories['psu'].id,
      overheadMultiplier: 1.3,
      baseWatts: 100,
      severity: 'warning',
    } as never,
  })

  // ---- Build templates ----
  for (const tpl of buildTemplateDefs) {
    const basePrice = tpl.slots.reduce((sum, [, title]) => sum + (productByTitle[title]?.price ?? 0), 0)
    await payload.create({
      collection: 'build-templates',
      draft: false,
      data: {
        name: tpl.name,
        slug: tpl.slug,
        description: tpl.description,
        tags: tpl.tags,
        slots: tpl.slots.map(([cat, title]) => ({
          category: slotCategories[cat].id,
          component: componentByTitle[title].id,
        })),
        basePrice,
        popularity: 0,
        _status: 'published',
      } as never,
    })
  }

  // ---- Commerce tables (discounts / shipping / tax — audit gaps P2-C3/C4/C5) ----
  await payload.create({
    collection: 'shipping-bands',
    data: { label: 'Standard', minSubtotal: 0, price: 595, enabled: true },
  })
  await payload.create({
    collection: 'shipping-bands',
    data: { label: 'Free over €500', minSubtotal: 50_000, price: 0, enabled: true },
  })
  await payload.create({
    collection: 'tax-rates',
    data: { country: '', rate: 20, isDefault: true, enabled: true },
  })
  await payload.create({
    collection: 'discount-codes',
    data: { code: 'WELCOME10', type: 'percentage', value: 10, enabled: true },
  })

  // ---- Pages (Phase 3: block-composed pages, 10-blocks-pages.md; idempotent by slug) ----
  const { seedPages } = await import('./pages-seed.ts')
  const pageCount = await seedPages(payload)

  // ---- Nexus storefront globals (entry 71; fresh DBs only — the early
  // return above keeps existing installs on their current preset) ----
  await payload.updateGlobal({
    slug: 'theme',
    data: { preset: 'nexus' } as never,
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      announcements: [
        { text: 'LIVE // CLEANROOM BUILD BAY — 3 rigs in assembly' },
        { text: 'Ships in 48h · VAT included · 24-month build warranty' },
        { text: 'Golden-bin CPU drops every Thursday' },
      ],
    } as never,
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'mega-menu',
    data: {
      sections: [
        {
          title: 'Component Ecosystem',
          description: 'Direct foundry silicon drops, architectural cooling, and high-frequency memory modules.',
          url: '/shop',
          items: [
            { label: 'GPU', subtitle: 'PCIe 5.0 GPUs, Ada Lovelace, RDNA3', url: '/shop/gpus', icon: 'speed', badge: 'Category' },
            { label: 'CPU', subtitle: 'LGA1700, AM5, Threadripper Pro', url: '/shop/cpu', icon: 'cpu', badge: 'Category' },
            { label: 'COOLING', subtitle: '360mm AIOs, Custom Distro Plates', url: '/shop/cooling', icon: 'fan', badge: 'Category' },
            { label: 'MEMORY', subtitle: 'DDR5 6000-8000 MT/s, Low CL30', url: '/shop/ram', icon: 'memory', badge: 'Category' },
            { label: 'STORAGE', subtitle: 'Up to 12,400 MB/s DirectStorage', url: '/shop/storage', icon: 'hard-drive', badge: 'Category' },
            { label: 'POWER', subtitle: 'ATX 3.1 1000W-1600W Native 12V', url: '/shop/psus', icon: 'zap', badge: 'Category' },
          ],
          featuredPromo: {
            title: 'Golden Sample SP114+ Silicon',
            description: 'Hand-selected processors capable of stable 6.2GHz single core.',
            buttonText: 'View Binned Drops',
            url: '/shop',
          },
        },
        {
          title: 'Pre-Built Workstations',
          description: 'ISO Class 6 laminar cleanroom assembled turnkey workstation tiers.',
          url: '/shop/pre-built-rigs',
          items: [
            { label: 'Tier I — Compact SFF', subtitle: '32L compact audio & 3D footprint', url: '/shop?prebuilt-tier=entry', badge: 'Tier I' },
            { label: 'Tier II — Flagship', subtitle: 'ML & Unreal Engine loop', url: '/shop?prebuilt-tier=high', badge: 'Tier II · Featured' },
            { label: 'Tier III — Lab Node', subtitle: 'Dual-GPU + Threadripper node', url: '/shop?prebuilt-tier=extreme', badge: 'Tier III' },
          ],
          featuredPromo: {
            title: 'Cleanroom-Assembled Tiers',
            description: 'Factory-delidded CPU, custom acrylic distro loop, cleanroom tested for 72 hours.',
            buttonText: 'Browse Pre-Builts',
            url: '/shop/pre-built-rigs',
          },
        },
        {
          title: 'Interactive Architecture',
          description: 'Visual motherboard component mapping & 3D studio.',
          url: '/explorer',
          items: [
            { label: 'Motherboard Slot Explorer', subtitle: 'Animated mounting experience', url: '/explorer', icon: 'chip', badge: 'Interactive' },
            { label: 'Custom Rig Configurator', subtitle: 'Compatibility-checked part picking', url: '/builder', icon: 'box', badge: 'Builder' },
            { label: 'Full Catalog', subtitle: 'Every component, searchable and filterable', url: '/shop', icon: 'speed' },
          ],
        },
      ],
    } as never,
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'packaging-tiers',
    data: {
      tiers: [
        {
          // Stable slug ids — cart lines reference tier.id (the field is
          // required+unique; omitting it left rows to payload's auto ids).
          id: 'standard-crate',
          name: 'Standard Crate',
          badge: 'Included',
          description: 'Foam-lined double-wall box, tracked courier.',
          features: [{ text: 'Double-wall corrugated' }, { text: 'Foam corner inserts' }],
          priceCents: 0,
          enabled: true,
        },
        {
          id: 'armor-transit',
          name: 'Armor Transit',
          badge: 'Recommended',
          description: 'Hard-shell transit crate with shock-mounted interior for full builds.',
          features: [{ text: 'Hard-shell crate' }, { text: 'Shock mount' }, { text: 'Insurance up to €2,500' }],
          priceCents: 4900,
          enabled: true,
        },
        {
          id: 'pelican-vault',
          name: 'Pelican Vault',
          badge: 'Maximum',
          description: 'Pelican-class vault case, humidity-controlled, white-glove delivery.',
          features: [{ text: 'Vault-grade case' }, { text: 'White-glove delivery' }, { text: 'Insurance up to €10,000' }],
          priceCents: 12900,
          enabled: true,
        },
      ],
    } as never,
    overrideAccess: true,
  })

  payload.logger.info(
    `Seed complete: users, ${categoryNames.length} categories, ${brandNames.length} brands, ` +
      `${productDefs.length} products + variants, ${Object.keys(componentByTitle).length} components, ` +
      `${ruleCount} compatibility rules, 1 derived power rule, ${buildTemplateDefs.length} build templates, ` +
      `${Object.keys(slotCategories).length} slot categories, ${placeholderMedia.length} placeholder images, ` +
      `2 shipping bands, 1 tax rate, 1 discount code, ${pageCount} pages.`,
  )
}

await seed()

export {}
