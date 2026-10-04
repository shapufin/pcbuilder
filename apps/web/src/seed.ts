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
  ]
  const categories: Record<string, { id: number | string }> = {}
  for (const name of categoryNames) {
    categories[name] = await payload.create({
      collection: 'categories',
      data: { title: name, slug: name.toLowerCase().replace(/\s+/g, '-'), _status: 'published' },
    })
  }

  // ---- Brands ----
  const brandNames = ['Intel', 'AMD', 'NVIDIA', 'ASUS', 'Corsair', 'Samsung', 'Microsoft']
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
        // C6: every product gets a placeholder gallery image + its typed attrs.
        gallery: [placeholderMedia[index % placeholderMedia.length].id],
        ...(attrs.length > 0 ? { attributeValues: attrs } : {}),
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
