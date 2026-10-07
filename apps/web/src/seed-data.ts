/**
 * Keys spread straight onto the components doc: rule-critical typed fields
 * (socket/tdpWatts/ramSlots/m2Slots…), `hasRgb`, and a `specsJson` record for
 * cosmetic display specs (vram/cores/chipset/efficiency — read by builder
 * designs via display.specs, never by the rule engine).
 */
export type BuilderSpec = Record<
  string,
  string | number | string[] | boolean | Record<string, unknown> | undefined
>

export interface ProductDef {
  title: string
  category: string
  brand: string
  price: number
  /** Builder slot mapping + doc fields. Absent = not a builder component. */
  builder?: { cat: string; spec: BuilderSpec }
  /** Catalog attributes: attributeType slug → attributeValue value (see attributeDefs). */
  attrs?: Record<string, string>
  /**
   * Product-level specsJson (free-form PDP table + Nexus meta keys:
   * spScore/goldenBin/delidded/colorHex/formFactor/tdpWatts/features…).
   * Distinct from builder.spec.specsJson which lands on components.
   */
  specs?: Record<string, unknown>
}

export const productDefs: ProductDef[] = [
  // CPUs
  { title: 'Intel Core i7-14700K', category: 'CPU', brand: 'Intel', price: 40900, attrs: { socket: 'LGA1700' }, builder: { cat: 'cpu', spec: { socket: 'LGA1700', tdpWatts: 253, specsJson: { cores: 20, threads: 28, clockBoostGhz: 5.6, cacheL3Mb: 33 } } },
    specs: { spScore: 108, delidded: true, tdpWatts: 253, features: ['Raptor Lake Refresh silicon', 'Binned for 6.0GHz sustained boost', 'Laser-checked V/F curve'] } },
  { title: 'AMD Ryzen 7 7800X3D', category: 'CPU', brand: 'AMD', price: 37900, attrs: { socket: 'AM5' }, builder: { cat: 'cpu', spec: { socket: 'AM5', tdpWatts: 120, specsJson: { cores: 8, threads: 16, clockBoostGhz: 5.0, cacheL3Mb: 96 } } },
    specs: { spScore: 112, goldenBin: true, tdpWatts: 120, features: ['3D V-Cache 96MB', 'Top 5% gaming bin', 'Cleanroom verified 72h'] } },
  { title: 'AMD Ryzen 5 7600X', category: 'CPU', brand: 'AMD', price: 20900, attrs: { socket: 'AM5' }, builder: { cat: 'cpu', spec: { socket: 'AM5', tdpWatts: 105, specsJson: { cores: 6, threads: 12, clockBoostGhz: 5.3, cacheL3Mb: 32 } } } },
  { title: 'Intel Core i5-14600K', category: 'CPU', brand: 'Intel', price: 27900, attrs: { socket: 'LGA1700' }, builder: { cat: 'cpu', spec: { socket: 'LGA1700', tdpWatts: 181, specsJson: { cores: 14, threads: 20, clockBoostGhz: 5.3, cacheL3Mb: 24 } } } },
  // Motherboards (ramSlots/m2Slots drive resolveSlotLimits — ITX 2/2 binds visibly)
  { title: 'ASUS ROG Strix B650E-F', category: 'Motherboards', brand: 'ASUS', price: 24900, attrs: { socket: 'AM5', 'ram-type': 'DDR5', 'form-factor': 'ATX' }, builder: { cat: 'motherboard', spec: { socket: 'AM5', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe', ramSlots: 4, m2Slots: 3, specsJson: { chipset: 'B650E', wifi: 'WiFi 6E' } } } },
  { title: 'ASUS Prime Z790-P', category: 'Motherboards', brand: 'ASUS', price: 19900, attrs: { socket: 'LGA1700', 'ram-type': 'DDR5', 'form-factor': 'ATX' }, builder: { cat: 'motherboard', spec: { socket: 'LGA1700', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe', ramSlots: 4, m2Slots: 3, specsJson: { chipset: 'Z790' } } } },
  { title: 'ASUS ROG Strix B760-F', category: 'Motherboards', brand: 'ASUS', price: 25900, attrs: { socket: 'LGA1700', 'ram-type': 'DDR5', 'form-factor': 'ATX' }, builder: { cat: 'motherboard', spec: { socket: 'LGA1700', ramType: 'DDR5', moboFormFactor: 'ATX', pcieVersion: '4.0', storageInterface: 'NVMe', ramSlots: 4, m2Slots: 3, specsJson: { chipset: 'B760', wifi: 'WiFi 6E' } } } },
  { title: 'ASUS ROG Strix B650E-I', category: 'Motherboards', brand: 'ASUS', price: 27900, attrs: { socket: 'AM5', 'ram-type': 'DDR5', 'form-factor': 'ITX' }, builder: { cat: 'motherboard', spec: { socket: 'AM5', ramType: 'DDR5', moboFormFactor: 'ITX', pcieVersion: '4.0', storageInterface: 'NVMe', ramSlots: 2, m2Slots: 2, specsJson: { chipset: 'B650E', wifi: 'WiFi 6E' } } } },
  // RAM
  { title: 'Corsair Vengeance 32GB DDR5-6000', category: 'RAM', brand: 'Corsair', price: 10900, attrs: { 'ram-type': 'DDR5' }, builder: { cat: 'ram', spec: { ramType: 'DDR5', ramSpeedMhz: 6000, specsJson: { kitGb: 32, casLatency: 36 } } } },
  { title: 'Corsair Vengeance 16GB DDR5-5600', category: 'RAM', brand: 'Corsair', price: 5900, attrs: { 'ram-type': 'DDR5' }, builder: { cat: 'ram', spec: { ramType: 'DDR5', ramSpeedMhz: 5600, specsJson: { kitGb: 16, casLatency: 36 } } } },
  { title: 'Corsair Vengeance 32GB DDR4-3600', category: 'RAM', brand: 'Corsair', price: 8900, attrs: { 'ram-type': 'DDR4' }, builder: { cat: 'ram', spec: { ramType: 'DDR4', ramSpeedMhz: 3600, specsJson: { kitGb: 32, casLatency: 18 } } } },
  { title: 'Corsair Dominator Platinum RGB 32GB DDR5-6400', category: 'RAM', brand: 'Corsair', price: 16500, attrs: { 'ram-type': 'DDR5' }, builder: { cat: 'ram', spec: { ramType: 'DDR5', ramSpeedMhz: 6400, hasRgb: true, specsJson: { kitGb: 32, casLatency: 32 } } } },
  // GPUs
  { title: 'NVIDIA RTX 4070 Super', category: 'GPUs', brand: 'NVIDIA', price: 59900, builder: { cat: 'gpu', spec: { tdpWatts: 220, gpuLengthMm: 267, pcieVersion: '4.0', hasRgb: true, specsJson: { vram: 12, boostMhz: 2475, peakDrawW: 245 } } },
    specs: { tdpWatts: 220, acousticFloor: '22 dBA', thermalDelta: '14°C', features: ['12GB GDDR6X', 'Ada Lovelace', 'Dual BIOS'] } },
  { title: 'NVIDIA RTX 4060', category: 'GPUs', brand: 'NVIDIA', price: 29900, builder: { cat: 'gpu', spec: { tdpWatts: 115, gpuLengthMm: 240, pcieVersion: '4.0', specsJson: { vram: 8, boostMhz: 2460, peakDrawW: 135 } } } },
  { title: 'NVIDIA RTX 4080 Super', category: 'GPUs', brand: 'NVIDIA', price: 109900, builder: { cat: 'gpu', spec: { tdpWatts: 320, gpuLengthMm: 310, pcieVersion: '5.0', hasRgb: true, specsJson: { vram: 16, boostMhz: 2550, peakDrawW: 355 } } },
    specs: { tdpWatts: 320, acousticFloor: '24 dBA', thermalDelta: '16°C', features: ['16GB GDDR6X', 'PCIe 5.0', 'Vapor chamber cooler'] } },
  { title: 'NVIDIA RTX 4060 Ti', category: 'GPUs', brand: 'NVIDIA', price: 44900, builder: { cat: 'gpu', spec: { tdpWatts: 160, gpuLengthMm: 240, pcieVersion: '4.0', specsJson: { vram: 8, boostMhz: 2535, peakDrawW: 175 } } } },
  // Storage
  { title: 'Samsung 990 Pro 1TB', category: 'Storage', brand: 'Samsung', price: 11900, attrs: { capacity: '1024' }, builder: { cat: 'storage', spec: { storageInterface: 'NVMe', specsJson: { capacityTb: 1, readMbps: 7450 } } } },
  { title: 'Samsung 990 Pro 2TB', category: 'Storage', brand: 'Samsung', price: 19900, attrs: { capacity: '2048' }, builder: { cat: 'storage', spec: { storageInterface: 'NVMe', specsJson: { capacityTb: 2, readMbps: 7450 } } } },
  { title: 'Samsung 970 EVO 512GB', category: 'Storage', brand: 'Samsung', price: 4900, attrs: { capacity: '512' }, builder: { cat: 'storage', spec: { storageInterface: 'NVMe', specsJson: { capacityTb: 0.5, readMbps: 3500 } } } },
  { title: 'Samsung 990 Pro 4TB', category: 'Storage', brand: 'Samsung', price: 28900, attrs: { capacity: '4096' }, builder: { cat: 'storage', spec: { storageInterface: 'NVMe', specsJson: { capacityTb: 4, readMbps: 7450 } } } },
  { title: 'Samsung 870 EVO 1TB', category: 'Storage', brand: 'Samsung', price: 9900, attrs: { capacity: '1024' }, builder: { cat: 'storage', spec: { storageInterface: 'SATA', specsJson: { capacityTb: 1, readMbps: 560 } } } },
  // PSUs
  { title: 'Corsair RM750x', category: 'PSUs', brand: 'Corsair', price: 10900, attrs: { wattage: '750' }, builder: { cat: 'psu', spec: { psuWatts: 750, specsJson: { efficiency: '80+ Gold', modularity: 'Fully modular', fanSizeMm: 135 } } } },
  { title: 'Corsair RM1000x', category: 'PSUs', brand: 'Corsair', price: 16900, attrs: { wattage: '1000' }, builder: { cat: 'psu', spec: { psuWatts: 1000, specsJson: { efficiency: '80+ Gold', modularity: 'Fully modular', fanSizeMm: 135 } } } },
  { title: 'Corsair RM650x', category: 'PSUs', brand: 'Corsair', price: 9900, attrs: { wattage: '650' }, builder: { cat: 'psu', spec: { psuWatts: 650, specsJson: { efficiency: '80+ Gold', modularity: 'Fully modular', fanSizeMm: 135 } } } },
  { title: 'Corsair RM850x', category: 'PSUs', brand: 'Corsair', price: 12900, attrs: { wattage: '850' }, builder: { cat: 'psu', spec: { psuWatts: 850, specsJson: { efficiency: '80+ Gold', modularity: 'Fully modular', fanSizeMm: 135 } } } },
  // Cases
  { title: 'Corsair 4000D Airflow', category: 'Cases', brand: 'Corsair', price: 8900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ATX', 'mATX', 'ITX'], caseGpuMaxLengthMm: 360, specsJson: { frontFanMounts: 3 } } } },
  { title: 'Corsair 5000D Airflow', category: 'Cases', brand: 'Corsair', price: 14900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ATX', 'mATX', 'ITX'], caseGpuMaxLengthMm: 420, specsJson: { frontFanMounts: 3 } } } },
  { title: 'Corsair 2000D Airflow', category: 'Cases', brand: 'Corsair', price: 10900, builder: { cat: 'case', spec: { caseSupportedFormFactors: ['ITX'], caseGpuMaxLengthMm: 280, specsJson: { frontFanMounts: 2 } } } },
  // Cooling
  { title: 'Corsair H150i Elite', category: 'Cooling', brand: 'Corsair', price: 14900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'], hasRgb: true, specsJson: { radSizeMm: 360, fanCount: 3, noiseDbA: 33 } } } },
  { title: 'Corsair A500 Air Cooler', category: 'Cooling', brand: 'Corsair', price: 6900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'], specsJson: { fanCount: 2, noiseDbA: 30 } } } },
  { title: 'Corsair H100i Elite', category: 'Cooling', brand: 'Corsair', price: 11900, builder: { cat: 'cooling', spec: { coolerSocketSupport: ['AM5', 'LGA1700'], hasRgb: true, specsJson: { radSizeMm: 240, fanCount: 2, noiseDbA: 31 } } } },
  // Case fans (optional 10th slot — spec's `case-fan` category)
  { title: 'Corsair AF120 Elite Fan', category: 'Cooling', brand: 'Corsair', price: 2900, builder: { cat: 'case-fan', spec: { specsJson: { fanSizeMm: 120, noiseDbA: 29 } } } },
  { title: 'Corsair QL140 RGB Fan', category: 'Cooling', brand: 'Corsair', price: 3900, builder: { cat: 'case-fan', spec: { hasRgb: true, specsJson: { fanSizeMm: 140, noiseDbA: 26 } } } },
  // OS
  { title: 'Microsoft Windows 11 Home', category: 'OS', brand: 'Microsoft', price: 12900, builder: { cat: 'os', spec: {} } },
  { title: 'Microsoft Windows 11 Pro', category: 'OS', brand: 'Microsoft', price: 19900 },
  // Ordinary shop items (spec: 20 — peripherals, accessories, monitors)
  { title: 'Corsair K70 RGB', category: 'Peripherals', brand: 'Corsair', price: 13900 },
  { title: 'Corsair K100 RGB', category: 'Peripherals', brand: 'Corsair', price: 22900 },
  { title: 'ASUS ROG Falchion', category: 'Peripherals', brand: 'ASUS', price: 16900 },
  { title: 'Corsair M65 RGB Ultra', category: 'Peripherals', brand: 'Corsair', price: 7900 },
  { title: 'ASUS ROG Gladius III', category: 'Peripherals', brand: 'ASUS', price: 8900 },
  { title: 'Corsair HS80 RGB', category: 'Peripherals', brand: 'Corsair', price: 11900 },
  { title: 'Corsair Virtuoso Max', category: 'Peripherals', brand: 'Corsair', price: 29900 },
  { title: 'Corsair MM350 Mousepad', category: 'Peripherals', brand: 'Corsair', price: 3900 },
  { title: 'ASUS ROG Balteus Qi', category: 'Peripherals', brand: 'ASUS', price: 9900 },
  { title: 'ASUS TUF Gaming 27" 144Hz', category: 'Monitors', brand: 'ASUS', price: 27900, attrs: { 'refresh-rate': '144' } },
  { title: 'ASUS 27" 240Hz OLED', category: 'Monitors', brand: 'ASUS', price: 54900, attrs: { 'refresh-rate': '240' } },
  { title: 'ASUS ROG Swift 32" 4K 144Hz', category: 'Monitors', brand: 'ASUS', price: 89900, attrs: { 'refresh-rate': '144' } },
  { title: 'ASUS TUF Gaming 24" 144Hz', category: 'Monitors', brand: 'ASUS', price: 19900, attrs: { 'refresh-rate': '144' } },
  { title: 'Samsung T7 Portable SSD 1TB', category: 'Storage', brand: 'Samsung', price: 10900, attrs: { capacity: '1024' } },
  { title: 'Samsung 870 QVO 2TB', category: 'Storage', brand: 'Samsung', price: 17900, attrs: { capacity: '2048' } },
  { title: 'Corsair Xeneon Flex 45" OLED', category: 'Monitors', brand: 'Corsair', price: 189900, attrs: { 'refresh-rate': '240' } },
  { title: 'Corsair TC100 Relaxed Chair', category: 'Peripherals', brand: 'Corsair', price: 24900 },
  { title: 'Corsair MM700 XL Mousepad', category: 'Peripherals', brand: 'Corsair', price: 5900 },
  { title: 'ASUS ROG Strix Arion SSD Enclosure', category: 'Storage', brand: 'ASUS', price: 6900 },
  // Pre-Built Rigs (entry 71): turnkey systems in their own category, faceted
  // by the prebuilt-tier attribute the Nexus rail/mega-menu link to.
  { title: 'Nexus One — Compact SFF', category: 'Pre-Built Rigs', brand: 'BuildMyRig', price: 189900,
    attrs: { 'prebuilt-tier': 'entry' },
    specs: { formFactor: 'ITX 32L', acousticFloor: '24 dBA', features: ['Ryzen 7 7800X3D', 'RTX 4070 Super', '32GB DDR5-6000', '1TB NVMe'] } },
  { title: 'Nexus Two — Flagship', category: 'Pre-Built Rigs', brand: 'BuildMyRig', price: 329900,
    attrs: { 'prebuilt-tier': 'high' },
    specs: { formFactor: 'ATX mid-tower', acousticFloor: '26 dBA', spScore: 114, features: ['Core i7-14700K delidded', 'RTX 4080 Super', '64GB DDR5-6400', '2TB NVMe', '360mm AIO'] } },
  { title: 'Nexus Three — Lab Node', category: 'Pre-Built Rigs', brand: 'BuildMyRig', price: 549900,
    attrs: { 'prebuilt-tier': 'extreme' },
    specs: { formFactor: 'Full tower', acousticFloor: '28 dBA', goldenBin: true, features: ['Dual-GPU workstation', '128GB DDR5 ECC', '4TB+2TB NVMe', 'Custom loop'] } },
]

export const slotCategoryDefs = [
  { slug: 'cpu', name: 'CPU', icon: 'cpu', sortOrder: 1, required: true, helperText: 'The brain of the system.' },
  { slug: 'motherboard', name: 'Motherboard', icon: 'motherboard', sortOrder: 2, required: true, helperText: 'Connects everything — must match CPU socket and RAM type.' },
  { slug: 'ram', name: 'Memory', icon: 'ram', sortOrder: 3, required: true, maxSelectable: 4, helperText: 'Faster is better for gaming and editing.' },
  { slug: 'gpu', name: 'Graphics Card', icon: 'gpu', sortOrder: 4, required: true, helperText: 'The main driver of gaming performance.' },
  { slug: 'storage', name: 'Storage', icon: 'storage', sortOrder: 5, required: true, maxSelectable: 4, helperText: 'NVMe SSDs recommended.' },
  { slug: 'psu', name: 'Power Supply', icon: 'psu', sortOrder: 6, required: true, helperText: 'Size it for total system draw plus headroom.' },
  { slug: 'case', name: 'Case', icon: 'case', sortOrder: 7, required: true, helperText: 'Must fit your motherboard and GPU length.' },
  { slug: 'cooling', name: 'CPU Cooling', icon: 'cooling', sortOrder: 8, required: true, helperText: 'Must support your CPU socket.' },
  { slug: 'os', name: 'Operating System', icon: 'os', sortOrder: 9, required: false, helperText: 'Optional — bring your own license or add one.' },
  { slug: 'case-fan', name: 'Case Fan', icon: 'cooling', sortOrder: 10, required: false, helperText: 'Optional extra airflow — comes with the case.' },
]

export interface RuleDef {
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

export const rules: RuleDef[] = [
  // Entry 68: standard relations (socket, ramType, form factor, GPU length,
  // cooler socket, NVMe) are now SYNTHESIZED from typed spec fields at index
  // build — see packages/plugin-pc-builder/src/lib/derived-rules.ts. Only
  // genuine per-product specials stay authored here.

  // PSU → GPU draw (advisory, per-PSU tuned thresholds — not synthesizable)
  { s: 'Corsair RM650x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 250, severity: 'warning', msg: 'A 650W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM750x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 350, severity: 'warning', msg: 'A 750W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM850x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 450, severity: 'warning', msg: 'An 850W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  { s: 'Corsair RM1000x', st: 'component', tCat: 'gpu', type: 'warns', op: 'lte', field: 'tdpWatts', value: 600, severity: 'warning', msg: 'A 1000W PSU is tight with a {tdpWatts}W GPU — consider more headroom.' },
  // Storage interface advisory (SATA is never a hard block — no requires row)
  { s: 'Samsung 870 EVO 1TB', st: 'component', tCat: 'motherboard', type: 'warns', op: 'equals', field: 'storageInterface', value: 'SATA', severity: 'warning', msg: '{componentA} is SATA — an NVMe drive would be much faster.' },
  // Component-specific target rule (2000D cannot fit the 4080 Super specifically)
  { s: 'Corsair 2000D Airflow', st: 'component', tCat: 'gpu', t: 'NVIDIA RTX 4080 Super', type: 'excludes', op: 'gte', field: 'gpuLengthMm', value: 281, msg: '{componentA} physically cannot fit the NVIDIA RTX 4080 Super.' },
  // Category-level pair rule (mothers → PSU wattage minimum, advisory)
  { s: 'motherboard', st: 'category', tCat: 'psu', type: 'warns', op: 'gte', field: 'psuWatts', value: 550, severity: 'info', msg: 'A modern system wants at least a 550W PSU.' },
]

export const buildTemplateDefs = [
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
  {
    name: 'Endurance Workstation',
    slug: 'endurance-workstation',
    description: 'Long-run simulation and rendering box — big PSU headroom, large NVMe, airflow.',
    tags: ['workstation', 'editing'],
    slots: [
      ['cpu', 'Intel Core i7-14700K'],
      ['motherboard', 'ASUS ROG Strix B760-F'],
      ['ram', 'Corsair Vengeance 32GB DDR5-6000'],
      ['gpu', 'NVIDIA RTX 4080 Super'],
      ['storage', 'Samsung 990 Pro 4TB'],
      ['psu', 'Corsair RM1000x'],
      ['case', 'Corsair 5000D Airflow'],
      ['cooling', 'Corsair H150i Elite'],
      ['case-fan', 'Corsair AF120 Elite Fan'],
      ['os', 'Microsoft Windows 11 Home'],
    ] as Array<[string, string]>,
  },
]

export type AttributeDef = [string, 'enum' | 'number', string | null, string[]]

export const attributeDefs: AttributeDef[] = [
  ['socket', 'enum', null, ['AM5', 'LGA1700', 'LGA1851']],
  ['ram-type', 'enum', null, ['DDR4', 'DDR5']],
  ['form-factor', 'enum', null, ['ATX', 'mATX', 'ITX']],
  ['capacity', 'number', 'GB', ['512', '1024', '2048', '4096']],
  ['wattage', 'number', 'W', ['550', '650', '750', '850', '1000']],
  ['refresh-rate', 'number', 'Hz', ['144', '240']],
  // Entry 71: Nexus "prebuilt workstation tier" facet (mega-menu links to
  // /shop?prebuilt-tier=…). Enum values match the source app's tier ids.
  ['prebuilt-tier', 'enum', null, ['entry', 'mid', 'high', 'extreme']],
]

/**
 * Display names for the attribute types (entry 64). The slug is the URL
 * filter param; the name is what the facet sidebar and the PDP compatibility
 * list render — without this map the seed writes the raw slug as the name.
 */
export const attributeTypeNames: Record<string, string> = {
  socket: 'Socket',
  'ram-type': 'RAM Type',
  'form-factor': 'Form Factor',
  capacity: 'Capacity',
  wattage: 'Wattage',
  'refresh-rate': 'Refresh Rate',
  'prebuilt-tier': 'Prebuilt Tier',
}
