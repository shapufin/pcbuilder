type BuilderSpec = Record<string, string | number | string[] | undefined>

interface ProductDef {
  title: string
  category: string
  brand: string
  price: number
  /** Builder slot mapping + rule-critical specs. Absent = not a builder component. */
  builder?: { cat: string; spec: BuilderSpec }
}

const CATEGORY_TO_SLOT: Record<string, string> = {
  CPU: 'cpu',
  Motherboards: 'motherboard',
  RAM: 'ram',
  GPUs: 'gpu',
  Storage: 'storage',
  PSUs: 'psu',
  Cases: 'case',
  Cooling: 'cooling',
  OS: 'os',
}

const productDefs: ProductDef[] = [
  // CPUs
  { title: 'Intel Core i7-14700K', category: 'CPU', brand: 'Intel', price: 40900, builder: { cat: 'cpu', spec: { socket: 'LGA1700', tdpWatts: 253 } } },
  { title: 'AMD Ryzen 7 7800X3D', category: 'CPU', brand: 'AMD', price: 37900, builder: { cat: 'cpu', spec: { socket: 'AM5', tdpWatts: 120 } } },
  { title: 'AMD Ryzen 5 7600X', category: 'CPU', brand: 'AMD', price: 20900, builder: { cat: 'cpu', spec: { socket: 'AM5', tdpWatts: 105 } } },
  { title: 'Intel Core i5-14600K', category: 'CPU', brand: 'Intel', price: 27900, builder: { cat: 'cpu', spec: { socket: 'LGA1700', tdpWatts: 181 } } },
  // Motherboards
  { title: 'ASUS ROG Strix B650E-F', category: 'Motherboards', brand: 'ASUS', price: 24900, builder: { cat: 'motherboard', spec: { socket: 'AM5', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe' } } },
  { title: 'ASUS Prime Z790-P', category: 'Motherboards', brand: 'ASUS', price: 19900, builder: { cat: 'motherboard', spec: { socket: 'LGA1700', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe' } } },
  { title: 'ASUS ROG Strix B760-F', category: 'Motherboards', brand: 'ASUS', price: 25900, builder: { cat: 'motherboard', spec: { socket: 'LGA1700', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe' } } },
  { title: 'ASUS ROG Strix B650E-I', category: 'Motherboards', brand: 'ASUS', price: 27900, builder: { cat: 'motherboard', spec: { socket: 'AM5', ramType: 'DDR5', moboFormFactor: 'ITX', pcieVersion: '4.0', storageInterface: 'NVMe' } } },
  // RAM
  { title: 'Corsair Vengeance 32GB DDR5-6000', category: 'RAM', brand: 'Corsair', price: 10900, builder: { cat: 'ram', spec: { ramType: 'DDR5', ramSpeedMhz: 6000 } } },
  { title: 'Corsair Vengeance 16GB DDR5-5600', category: 'RAM', brand: 'Corsair', price: 5900, builder: { cat: 'ram', spec: { ramType: 'DDR5', ramSpeedMhz: 5600 } } },
  { title: 'Corsair Vengeance 32GB DDR4-3600', category: 'RAM', brand: 'Corsair', price: 8900, builder: { cat: 'ram', spec: { ramType: 'DDR4', ramSpeedMhz: 3600 } } },
  // GPUs
  { title: 'NVIDIA RTX 4070 Super', category: 'GPUs', brand: 'NVIDIA', price: 59900, builder: { cat: 'gpu', spec: { tdpWatts: 220, gpuLengthMm: 267, pcieVersion: '4.0' } } },
  { title: 'NVIDIA RTX 4060', category: 'GPUs', brand: 'NVIDIA', price: 29900, builder: { cat: 'gpu', spec: { tdpWatts: 115, gpuLengthMm: 240, pcieVersion: '4.0' } } },
  { title: 'NVIDIA RTX 4080 Super', category: 'GPUs', brand: 'NVIDIA', price: 109900, builder: { cat: 'gpu', spec: { tdpWatts: 320, gpuLengthMm: 310, pcieVersion: '5.0' } } },
  { title: 'NVIDIA RTX 4060 Ti', category: 'GPUs', brand: 'NVIDIA', price: 44900, builder: { cat: 'gpu', spec: { tdpWatts: 160, gpuLengthMm: 240, pcieVersion: '4.0' } } },
  // Storage
  { title: 'Samsung 990 Pro 1TB', category: 'Storage', brand: 'Samsung', price: 11900, builder: { cat: 'storage', spec: { storageInterface: 'NVMe' } } },
  { title: 'Samsung 990 Pro 2TB', category: 'Storage', brand: 'Samsung', price: 19900, builder: { cat: 'storage', spec: { storageInterface: 'NVMe' } } },
  { title: 'Samsung 970 EVO 512GB', category: 'Storage', brand: 'Samsung', price: 4900, builder: { cat: 'storage', spec: { storageInterface: 'NVMe' } } },
  { title: 'Samsung 990 Pro 4TB', category: 'Storage', brand: 'Samsung', price: 28900, builder: { cat: 'storage', spec: { storageInterface: 'NVMe' } } },
  { title: 'Samsung 870 EVO 1TB', category: 'Storage', brand: 'Samsung', price: 9900, builder: { cat: 'storage', spec: { storageInterface: 'SATA' } } },
  // PSUs
  { title: 'Corsair RM750x', category: 'PSUs', brand: 'Corsair', price: 10900, builder: { cat: 'psu', spec: { psuWatts: 750 } } },
  { title: 'Corsair RM1000x', category: 'PSUs', brand: 'Corsair', price: 16900, builder: { cat: 'psu', spec: { psuWatts: 1000 } } },
  { title: 'Corsair RM650x', category: 'PSUs', brand: 'Corsair', price: 9900, builder: { cat: 'psu', spec: { psuWatts: 650 } } },
  { title: 'Corsair RM850x', category: 'PSUs', brand: 'Corsair', price: 12900, builder: { cat: 'psu', spec: { psuWatts: 850 } } },
  // Cases
  { title: 'Corsair 4000D Airflow', category: 'Cases', brand: 'Corsair', price: 8900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ATX', 'mATX', 'ITX'], caseGpuMaxLengthMm: 360 } } },
  { title: 'Corsair 5000D Airflow', category: 'Cases', brand: 'Corsair', price: 14900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ATX', 'mATX', 'ITX'], caseGpuMaxLengthMm: 420 } } },
  { title: 'Corsair 2000D Airflow', category: 'Cases', brand: 'Corsair', price: 10900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ITX'], caseGpuMaxLengthMm: 280 } } },
  // Cooling
  { title: 'Corsair H150i Elite', category: 'Cooling', brand: 'Corsair', price: 14900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'] } } },
  { title: 'Corsair A500 Air Cooler', category: 'Cooling', brand: 'Corsair', price: 6900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'] } } },
  { title: 'Corsair H100i Elite', category: 'Cooling', brand: 'Corsair', price: 11900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'] } } },
  // OS
  { title: 'Microsoft Windows 11 Home', category: 'OS', brand: 'Microsoft', price: 12900, builder: { cat: 'os', spec: {} } },
  // Non-builder shop items
  { title: 'Corsair K70 RGB', category: 'Peripherals', brand: 'Corsair', price: 13900 },
  { title: 'ASUS TUF Gaming 27" 144Hz', category: 'Monitors', brand: 'ASUS', price: 27900 },
  { title: 'ASUS 27" 240Hz OLED', category: 'Monitors', brand: 'ASUS', price: 54900 },
]

const slotCategoryDefs = [
  { slug: 'cpu', name: 'CPU', icon: 'cpu', sortOrder: 1, required: true, helperText: 'The brain of the system.' },
  { slug: 'motherboard', name: 'Motherboard', icon: 'motherboard', sortOrder: 2, required: true, helperText: 'Connects everything — must match CPU socket and RAM type.' },
  { slug: 'ram', name: 'Memory', icon: 'ram', sortOrder: 3, required: true, maxSelectable: 2, helperText: 'Faster is better for gaming and editing.' },
  { slug: 'gpu', name: 'Graphics Card', icon: 'gpu', sortOrder: 4, required: true, helperText: 'The main driver of gaming performance.' },
  { slug: 'storage', name: 'Storage', icon: 'storage', sortOrder: 5, required: true, maxSelectable: 2, helperText: 'NVMe SSDs recommended.' },
  { slug: 'psu', name: 'Power Supply', icon: 'psu', sortOrder: 6, required: true, helperText: 'Size it for total system draw plus headroom.' },
  { slug: 'case', name: 'Case', icon: 'case', sortOrder: 7, required: true, helperText: 'Must fit your motherboard and GPU length.' },
  { slug: 'cooling', name: 'CPU Cooling', icon: 'cooling', sortOrder: 8, required: true, helperText: 'Must support your CPU socket.' },
  { slug: 'os', name: 'Operating System', icon: 'os', sortOrder: 9, required: false, helperText: 'Optional — bring your own license or add one.' },
]

interface RuleDef {
  s: string
  st: 'component' | 'category'
  tCat: string
  t?: string
  type: 'requires' | 'excludes' | 'supports' | 'warns'
  op: 'equals' | 'in' | 'gte' | 'lte' | 'contains'
  field: string
  value: string | number
  severity?: 'error' | 'warning' | 'info'
  bi?: boolean
  msg: string
}

const rules: RuleDef[] = [
  // CPU → motherboard socket (bidirectional)
  { s: 'Intel Core i7-14700K', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'socket', value: 'LGA1700', bi: true, msg: '{componentA} uses socket LGA1700 but the selected motherboard does not.' },
  { s: 'AMD Ryzen 7 7800X3D', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'socket', value: 'AM5', bi: true, msg: '{componentA} uses socket AM5 but the selected motherboard does not.' },
  { s: 'AMD Ryzen 5 7600X', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'socket', value: 'AM5', bi: true, msg: '{componentA} uses socket AM5 but the selected motherboard does not.' },
  { s: 'Intel Core i5-14600K', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'socket', value: 'LGA1700', bi: true, msg: '{componentA} uses socket LGA1700 but the selected motherboard does not.' },
  // Motherboard → CPU socket (explicit opposite direction)
  { s: 'ASUS ROG Strix B650E-F', st: 'component', tCat: 'cpu', type: 'requires', op: 'equals', field: 'socket', value: 'AM5', msg: '{componentA} has an AM5 socket but the selected CPU does not.' },
  { s: 'ASUS Prime Z790-P', st: 'component', tCat: 'cpu', type: 'requires', op: 'equals', field: 'socket', value: 'LGA1700', msg: '{componentA} has an LGA1700 socket but the selected CPU does not.' },
  { s: 'ASUS ROG Strix B760-F', st: 'component', tCat: 'cpu', type: 'requires', op: 'equals', field: 'socket', value: 'LGA1700', msg: '{componentA} has an LGA1700 socket but the selected CPU does not.' },
  { s: 'ASUS ROG Strix B650E-I', st: 'component', tCat: 'cpu', type: 'requires', op: 'equals', field: 'socket', value: 'AM5', msg: '{componentA} has an AM5 socket but the selected CPU does not.' },
  // RAM → motherboard memory type
  { s: 'Corsair Vengeance 32GB DDR5-6000', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', bi: true, msg: '{componentA} is DDR5 but the motherboard only supports {ramType}.' },
  { s: 'Corsair Vengeance 16GB DDR5-5600', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', bi: true, msg: '{componentA} is DDR5 but the motherboard only supports {ramType}.' },
  { s: 'Corsair Vengeance 32GB DDR4-3600', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR4', bi: true, msg: '{componentA} is DDR4 but the motherboard only supports {ramType}.' },
  // Motherboard → RAM type
  { s: 'ASUS ROG Strix B650E-F', st: 'component', tCat: 'ram', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', msg: '{componentA} supports DDR5 only.' },
  { s: 'ASUS Prime Z790-P', st: 'component', tCat: 'ram', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', msg: '{componentA} supports DDR5 only.' },
  { s: 'ASUS ROG Strix B760-F', st: 'component', tCat: 'ram', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', msg: '{componentA} supports DDR5 only.' },
  { s: 'ASUS ROG Strix B650E-I', st: 'component', tCat: 'ram', type: 'requires', op: 'equals', field: 'ramType', value: 'DDR5', msg: '{componentA} supports DDR5 only.' },
  // Motherboard → case form factor
  { s: 'ASUS ROG Strix B650E-F', st: 'component', tCat: 'case', type: 'requires', op: 'contains', field: 'caseSupportedFormFactors', value: 'ATX', msg: '{componentA} is ATX but the case does not fit ATX boards.' },
  { s: 'ASUS Prime Z790-P', st: 'component', tCat: 'case', type: 'requires', op: 'contains', field: 'caseSupportedFormFactors', value: 'ATX', msg: '{componentA} is ATX but the case does not fit ATX boards.' },
  { s: 'ASUS ROG Strix B760-F', st: 'component', tCat: 'case', type: 'requires', op: 'contains', field: 'caseSupportedFormFactors', value: 'ATX', msg: '{componentA} is ATX but the case does not fit ATX boards.' },
  { s: 'ASUS ROG Strix B650E-I', st: 'component', tCat: 'case', type: 'requires', op: 'contains', field: 'caseSupportedFormFactors', value: 'ITX', msg: '{componentA} is ITX but the case does not fit ITX boards.' },
  // GPU → case max GPU length
  { s: 'NVIDIA RTX 4070 Super', st: 'component', tCat: 'case', type: 'requires', op: 'gte', field: 'caseGpuMaxLengthMm', value: 267, msg: '{componentA} is 267mm long; the case supports {caseGpuMaxLengthMm}mm.' },
  { s: 'NVIDIA RTX 4060', st: 'component', tCat: 'case', type: 'requires', op: 'gte', field: 'caseGpuMaxLengthMm', value: 240, msg: '{componentA} is 240mm long; the case supports {caseGpuMaxLengthMm}mm.' },
  { s: 'NVIDIA RTX 4080 Super', st: 'component', tCat: 'case', type: 'requires', op: 'gte', field: 'caseGpuMaxLengthMm', value: 310, msg: '{componentA} is 310mm long; the case supports {caseGpuMaxLengthMm}mm.' },
  { s: 'NVIDIA RTX 4060 Ti', st: 'component', tCat: 'case', type: 'requires', op: 'gte', field: 'caseGpuMaxLengthMm', value: 240, msg: '{componentA} is 240mm long; the case supports {caseGpuMaxLengthMm}mm.' },
  // PSU → GPU draw (advisory)
  { s: 'Corsair RM650x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 250, severity: 'warning', msg: 'A 650W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM750x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 350, severity: 'warning', msg: 'A 750W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM850x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 450, severity: 'warning', msg: 'An 850W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM1000x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 600, severity: 'warning', msg: 'A 1000W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  // CPU → cooler socket support (bidirectional)
  { s: 'Intel Core i7-14700K', st: 'component', tCat: 'cooling', type: 'requires', op: 'contains', field: 'coolerSocketSupport', value: 'LGA1700', bi: true, msg: '{componentA} needs a cooler that supports LGA1700.' },
  { s: 'AMD Ryzen 7 7800X3D', st: 'component', tCat: 'cooling', type: 'requires', op: 'contains', field: 'coolerSocketSupport', value: 'AM5', bi: true, msg: '{componentA} needs a cooler that supports AM5.' },
  { s: 'AMD Ryzen 5 7600X', st: 'component', tCat: 'cooling', type: 'requires', op: 'contains', field: 'coolerSocketSupport', value: 'AM5', bi: true, msg: '{componentA} needs a cooler that supports AM5.' },
  { s: 'Intel Core i5-14600K', st: 'component', tCat: 'cooling', type: 'requires', op: 'contains', field: 'coolerSocketSupport', value: 'LGA1700', bi: true, msg: '{componentA} needs a cooler that supports LGA1700.' },
  // ITX case constraints
  { s: 'Corsair 2000D Airflow', st: 'component', tCat: 'gpu', type: 'excludes', op: 'gte', field: 'gpuLengthMm', value: 281, msg: '{componentA} fits GPUs up to 280mm — this GPU is {gpuLengthMm}mm.' },
  { s: 'Corsair 2000D Airflow', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'moboFormFactor', value: 'ITX', msg: '{componentA} fits ITX motherboards only.' },
  // Storage interface
  { s: 'Samsung 990 Pro 1TB', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'storageInterface', value: 'NVMe', msg: '{componentA} is an NVMe drive; the motherboard lacks an NVMe slot.' },
  { s: 'Samsung 990 Pro 2TB', st: 'component', tCat: 'motherboard', type: 'requires', op: 'equals', field: 'storageInterface', value: 'NVMe', msg: '{componentA} is an NVMe drive; the motherboard lacks an NVMe slot.' },
  { s: 'Samsung 870 EVO 1TB', st: 'component', tCat: 'motherboard', type: 'warns', op: 'equals', field: 'storageInterface', value: 'SATA', severity: 'warning', msg: '{componentA} is SATA — an NVMe drive would be much faster.' },
  // PCIe version advisories
  { s: 'NVIDIA RTX 4080 Super', st: 'component', tCat: 'motherboard', type: 'warns', op: 'gte', field: 'pcieVersion', value: '5.0', severity: 'warning', msg: '{componentA} is PCIe 5.0; this board runs PCIe {pcieVersion} — slight bandwidth loss.' },
  { s: 'NVIDIA RTX 4070 Super', st: 'component', tCat: 'motherboard', type: 'warns', op: 'gte', field: 'pcieVersion', value: '4.0', severity: 'info', msg: '{componentA} is PCIe 4.0; this board runs PCIe {pcieVersion}.' },
  { s: 'NVIDIA RTX 4060', st: 'component', tCat: 'motherboard', type: 'warns', op: 'gte', field: 'pcieVersion', value: '4.0', severity: 'info', msg: '{componentA} is PCIe 4.0; this board runs PCIe {pcieVersion}.' },
  { s: 'NVIDIA RTX 4060 Ti', st: 'component', tCat: 'motherboard', type: 'warns', op: 'gte', field: 'pcieVersion', value: '4.0', severity: 'info', msg: '{componentA} is PCIe 4.0; this board runs PCIe {pcieVersion}.' },
  // Component-specific target rule (2000D cannot fit the 4080 Super specifically)
  { s: 'Corsair 2000D Airflow', st: 'component', tCat: 'gpu', t: 'NVIDIA RTX 4080 Super', type: 'excludes', op: 'gte', field: 'gpuLengthMm', value: 281, msg: '{componentA} physically cannot fit the NVIDIA RTX 4080 Super.' },
  // Category-level pair rule (mothers → PSU wattage minimum, advisory)
  { s: 'motherboard', st: 'category', tCat: 'psu', type: 'warns', op: 'gte', field: 'psuWatts', value: 550, severity: 'info', msg: 'A modern system wants at least a 550W PSU.' },
]

const buildTemplateDefs = [
  {
    name: 'Vanguard Gaming PC',
    slug: 'vanguard-gaming-pc',
    description: 'Our balanced 1440p gaming build — high refresh rates out of the box.',
    tags: ['gaming', 'streaming'],
    slots: [
      ['cpu', 'AMD Ryzen 7 7800X3D'],
      ['motherboard', 'ASUS ROG Strix B650E-F'],
      ['ram', 'Corsair Vengeance 32GB DDR5-6000'],
      ['gpu', 'NVIDIA RTX 4070 Super'],
      ['storage', 'Samsung 990 Pro 1TB'],
      ['psu', 'Corsair RM750x'],
      ['case', 'Corsair 5000D Airflow'],
      ['cooling', 'Corsair H150i Elite'],
    ] as Array<[string, string]>,
  },
  {
    name: 'Compact Creator ITX',
    slug: 'compact-creator-itx',
    description: 'Small-footprint workstation for editing and light gaming.',
    tags: ['editing', 'workstation'],
    slots: [
      ['cpu', 'AMD Ryzen 5 7600X'],
      ['motherboard', 'ASUS ROG Strix B650E-I'],
      ['ram', 'Corsair Vengeance 16GB DDR5-5600'],
      ['gpu', 'NVIDIA RTX 4060 Ti'],
      ['storage', 'Samsung 990 Pro 2TB'],
      ['psu', 'Corsair RM650x'],
      ['case', 'Corsair 2000D Airflow'],
      ['cooling', 'Corsair A500 Air Cooler'],
    ] as Array<[string, string]>,
  },
]

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
    'Cases', 'Cooling', 'Peripherals', 'Monitors', 'OS',
  ]
  const categories: Record<string, { id: number | string }> = {}
  for (const name of categoryNames) {
    categories[name] = await payload.create({
      collection: 'categories',
      data: { title: name, slug: name.toLowerCase().replace(/\s+/g, '-') },
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
  const attributeDefs: Array<[string, 'enum' | 'number', string | null, string[]]> = [
    ['socket', 'enum', null, ['AM5', 'LGA1700', 'LGA1851']],
    ['ram-type', 'enum', null, ['DDR4', 'DDR5']],
    ['form-factor', 'enum', null, ['ATX', 'mATX', 'ITX']],
    ['capacity', 'number', 'GB', ['512', '1024', '2048']],
    ['wattage', 'number', 'W', ['550', '650', '750', '850', '1000']],
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

  // ---- Component categories (builder slots) ----
  const slotCategories: Record<string, { id: number | string }> = {}
  for (const def of slotCategoryDefs) {
    slotCategories[def.slug] = await payload.create({ collection: 'component-categories', data: def })
  }

  // ---- Products + variants + components ----
  const productByTitle: Record<string, { id: number | string; price: number }> = {}
  const variantByTitle: Record<string, { id: number | string }> = {}
  const componentByTitle: Record<string, { id: number | string }> = {}

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
        priceInEUREnabled: true,
        priceInEUR: def.price,
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
      } as never,
    })
  }

  payload.logger.info(
    `Seed complete: users, ${categoryNames.length} categories, ${brandNames.length} brands, ` +
      `${productDefs.length} products + variants, ${Object.keys(componentByTitle).length} components, ` +
      `${ruleCount} compatibility rules, 1 derived power rule, ${buildTemplateDefs.length} build templates.`,
  )
}

await seed()

export {}
