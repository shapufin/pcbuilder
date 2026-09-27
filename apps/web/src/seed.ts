const seed = async (): Promise<void> => {
  const { getPayload } = await import('payload')
  const config = await (await import('./payload.config.ts')).default
  const payload = await getPayload({ config })
  payload.logger.info('Seeding BuildMyRig data...')

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
  payload.logger.info(`admin user: ${admin.email}`)

  // ---- Categories ----
  const categoryNames = [
    'CPU', 'Motherboards', 'RAM', 'GPUs', 'Storage', 'PSUs',
    'Cases', 'Cooling', 'Peripherals', 'Monitors',
  ]
  const categories: Record<string, { id: number | string }> = {}
  for (const name of categoryNames) {
    categories[name] = await payload.create({
      collection: 'categories',
      data: { title: name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    })
  }

  // ---- Brands ----
  const brandNames = ['Intel', 'AMD', 'NVIDIA', 'ASUS', 'Corsair', 'Samsung']
  const brands: Record<string, { id: number | string }> = {}
  for (const name of brandNames) {
    brands[name] = await payload.create({
      collection: 'brands',
      data: { name, slug: name.toLowerCase() },
    })
  }

  // ---- Attribute types + values ----
  const attributeDefs: Array<[string, 'enum' | 'number', string | null, string[]]> = [
    ['socket', 'enum', null, ['AM5', 'LGA1700', 'LGA1851']],
    ['ram-type', 'enum', null, ['DDR4', 'DDR5']],
    ['form-factor', 'enum', null, ['ATX', 'mATX', 'ITX']],
    ['capacity', 'number', 'GB', ['512', '1024', '2048']],
    ['wattage', 'number', 'W', ['550', '750', '1000']],
    ['refresh-rate', 'number', 'Hz', ['144', '240']],
  ]
  const attributeValues: Record<string, { id: number | string }> = {}
  for (const [slug, valueType, unit, values] of attributeDefs) {
    const attrType = await payload.create({
      collection: 'attribute-types',
      data: { name: slug, slug, valueType, unit: unit ?? undefined },
    })
    for (const v of values) {
      attributeValues[`${slug}:${v}`] = await payload.create({
        collection: 'attribute-values',
        data: { attributeType: attrType.id, value: v },
      })
    }
  }

  // ---- Products (20) ----
  const productDefs: Array<{ title: string; category: string; brand: string; price: number }> = [
    { title: 'Intel Core i7-14700K', category: 'CPU', brand: 'Intel', price: 40900 },
    { title: 'AMD Ryzen 7 7800X3D', category: 'CPU', brand: 'AMD', price: 37900 },
    { title: 'AMD Ryzen 5 7600X', category: 'CPU', brand: 'AMD', price: 20900 },
    { title: 'Intel Core i5-14600K', category: 'CPU', brand: 'Intel', price: 27900 },
    { title: 'ASUS ROG Strix B650E-F', category: 'Motherboards', brand: 'ASUS', price: 24900 },
    { title: 'ASUS Prime Z790-P', category: 'Motherboards', brand: 'ASUS', price: 19900 },
    { title: 'Corsair Vengeance 32GB DDR5-6000', category: 'RAM', brand: 'Corsair', price: 10900 },
    { title: 'Corsair Vengeance 16GB DDR5-5600', category: 'RAM', brand: 'Corsair', price: 5900 },
    { title: 'NVIDIA RTX 4070 Super', category: 'GPUs', brand: 'NVIDIA', price: 59900 },
    { title: 'NVIDIA RTX 4060', category: 'GPUs', brand: 'NVIDIA', price: 29900 },
    { title: 'Samsung 990 Pro 1TB', category: 'Storage', brand: 'Samsung', price: 11900 },
    { title: 'Samsung 990 Pro 2TB', category: 'Storage', brand: 'Samsung', price: 19900 },
    { title: 'Samsung 970 EVO 512GB', category: 'Storage', brand: 'Samsung', price: 4900 },
    { title: 'Corsair RM750x', category: 'PSUs', brand: 'Corsair', price: 10900 },
    { title: 'Corsair RM1000x', category: 'PSUs', brand: 'Corsair', price: 16900 },
    { title: 'Corsair 4000D Airflow', category: 'Cases', brand: 'Corsair', price: 8900 },
    { title: 'Corsair H150i Elite', category: 'Cooling', brand: 'Corsair', price: 14900 },
    { title: 'Corsair K70 RGB', category: 'Peripherals', brand: 'Corsair', price: 13900 },
    { title: 'ASUS TUF Gaming 27" 144Hz', category: 'Monitors', brand: 'ASUS', price: 27900 },
    { title: 'ASUS 27" 240Hz OLED', category: 'Monitors', brand: 'ASUS', price: 54900 },
  ]

  for (const def of productDefs) {
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
        prices: { priceInEUREnabled: true, priceInEUR: def.price },
        _status: 'published',
      } as never,
    })

    const variantType = await payload.create({
      collection: 'variantTypes',
      data: { label: 'Model', name: 'model' },
    })
    const variantOption = await payload.create({
      collection: 'variantOptions',
      data: { variantType: variantType.id, label: 'Standard', value: 'standard' },
    })
    await payload.create({
      collection: 'variants',
      draft: false,
      data: {
        title: `${def.title} (default)`,
        product: product.id,
        options: [variantOption.id],
        prices: { priceInEUREnabled: true, priceInEUR: def.price },
      } as never,
    })
  }

  payload.logger.info('Seed complete: users, categories, brands, attributes, 20 products + variants.')
}

await seed()

export {}
