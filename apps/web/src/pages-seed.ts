import type { Payload } from 'payload'

/**
 * Phase-3 page content (10-blocks-pages.md composition map).
 * Idempotent by slug — safe on both a fresh seed and an existing DB.
 * Returns the number of pages created.
 */

type LexicalParagraph = Record<string, unknown>

const rt = (paragraphs: string[]) =>
  ({
    root: {
      type: 'root',
      children: paragraphs.map(
        (text): LexicalParagraph => ({
          type: 'paragraph',
          children: [{ type: 'text', text, format: 0, version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        }),
      ),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }) as never

const faqItems = [
  {
    question: 'Do the parts actually fit together?',
    answer:
      'Every component in the builder is validated against compatibility rules (socket, RAM type, case clearances, PSU wattage) before you can save or buy.',
  },
  {
    question: 'Can I start from a template and change parts?',
    answer: 'Yes — pick a template on the builder landing page, then swap any component in configure mode.',
  },
  { question: 'Do you support custom water cooling?', answer: 'Air and AIO coolers are supported in v1. Custom loop planning is on the roadmap.' },
  {
    question: 'What warranty do assembled rigs carry?',
    answer: 'Components carry their manufacturer warranties; assembled systems add a 24-month build warranty covering labour.',
  },
]

export const seedPages = async (payload: Payload): Promise<number> => {
  const existing = await payload.find({ collection: 'pages', limit: 200, overrideAccess: true })
  const have = new Set(existing.docs.map((d) => String((d as { slug?: string }).slug)))

  const categoryDocs = await payload.find({ collection: 'categories', limit: 50, overrideAccess: true })
  const catIdByTitle = new Map(categoryDocs.docs.map((c) => [String(c.title), c.id as number | string]))
  const brandDocs = await payload.find({ collection: 'brands', limit: 50, overrideAccess: true })
  const allBrandIds = brandDocs.docs.map((b) => b.id as number | string)

  let created = 0
  const createPage = async (data: Record<string, unknown>): Promise<void> => {
    const slug = String(data.slug)
    if (have.has(slug)) return
    await payload.create({ collection: 'pages', draft: false, data: data as never })
    created += 1
  }

  const matrixItem = (title: string, icon: string, blurb: string) => {
    const id = catIdByTitle.get(title)
    return id ? { category: id, icon, blurb } : null
  }

  await createPage({
    title: 'Home',
    slug: 'home',
    isHomepage: true,
    _status: 'published',
    seo: {
      title: 'BuildMyRig — custom PCs, configured your way',
      description: 'Pre-built gaming and creator PCs, or configure your own — step by step.',
    },
    // Entry 71: Nexus-composed homepage. The nx-* blocks render under every
    // preset (vars adapt); under the Nexus pack they get the full treatment.
    layout: [
      {
        blockType: 'nexusHero',
        eyebrow: 'Atelier silicon // cleanroom builds',
        heading: 'Precision built. Thermally invisible.',
        gradientText: 'Thermally invisible.',
        body: 'Hand-binned CPUs, vapor-chamber GPUs and ISO-6 cleanroom assembly — configure your own rig or pick a turnkey workstation.',
        ctas: [
          { label: 'Open the configurator', url: '/builder', style: 'primary' },
          { label: 'Browse the catalog', url: '/shop', style: 'ghost' },
        ],
        showRigVisualizer: true,
        hint: 'Drag the rig to orbit · all parts compatibility-checked',
      },
      {
        blockType: 'nexusCategoryMatrix',
        eyebrow: 'Component ecosystem',
        heading: 'Pick your silicon',
        items: [
          matrixItem('GPUs', 'gpu', 'PCIe 5.0 flagships to 1080p workhorses'),
          matrixItem('CPU', 'cpu', 'Binned chips, delidded options, AM5 & LGA1700'),
          matrixItem('Cooling', 'cooling', '360mm AIOs and quiet air towers'),
          matrixItem('RAM', 'ram', 'DDR5 6000–6400 MT/s low-latency kits'),
          matrixItem('Storage', 'storage', 'NVMe up to 7,450 MB/s reads'),
          matrixItem('PSUs', 'power', 'ATX 3.1 modular, 650–1000W'),
        ].filter(Boolean),
      },
      {
        blockType: 'nexusProductRail',
        eyebrow: 'Fresh silicon',
        heading: 'Latest drops',
        limit: 6,
      },
      ...(catIdByTitle.get('Pre-Built Rigs')
        ? [
            {
              blockType: 'nexusProductRail',
              eyebrow: 'Turnkey',
              heading: 'Pre-built workstations',
              category: catIdByTitle.get('Pre-Built Rigs'),
              limit: 3,
              showTierChips: true,
            },
          ]
        : []),
      {
        blockType: 'nexusSlotExplorer',
        eyebrow: 'Interactive architecture',
        heading: 'Explore the motherboard',
        body: 'Click a mounted module to inspect it — empty slots open the catalog.',
      },
      { blockType: 'templatesCarousel', heading: 'Ready-to-go builds', autoplay: false },
      { blockType: 'logosStrip', heading: 'Brands we carry', brands: allBrandIds },
      {
        blockType: 'testimonials',
        heading: 'What builders say',
        items: [
          { quote: 'The compatibility checker saved me from a socket mismatch on my first build.', name: 'Marta K.', role: 'First-time builder' },
          { quote: 'Ordered a template, swapped the GPU, checkout took two minutes.', name: 'Jonas B.', role: 'Stream gear upgrade' },
          { quote: 'Clear pricing in the summary — no surprise VAT at the end.', name: 'Priya S.', role: 'Workstation buyer' },
        ],
      },
      { blockType: 'newsletterSignup', heading: 'Get build deals in your inbox', consent: 'No spam — unsubscribe anytime.' },
    ],
  })

  await createPage({
    title: 'FAQ',
    slug: 'faq',
    _status: 'published',
    seo: { title: 'FAQ', description: 'Answers about compatibility, templates, warranty and shipping.' },
    layout: [
      {
        blockType: 'richText',
        richtext: rt([
          'Everything you need to know before ordering a custom build. Still stuck? Contact support and a human will reply within one working day.',
        ]),
      },
      {
        blockType: 'faq',
        heading: 'Frequently asked questions',
        items: faqItems.map((item) => ({ question: item.question, answer: rt([item.answer]) })),
      },
      {
        blockType: 'ctaBanner',
        heading: 'Ready to build?',
        copy: 'Open the configurator and see live compatibility feedback as you pick parts.',
        ctaLabel: 'Open the builder',
        ctaUrl: '/builder',
        tone: 'indigo',
      },
    ],
  })

  for (const pageDef of [
    {
      title: 'About us',
      slug: 'about',
      description: 'Who builds BuildMyRig and how we pick parts.',
      paragraphs: [
        'BuildMyRig started because buying a custom PC should not require three forums and a spreadsheet. We combine a vetted catalog with a rule engine that checks every combination before you pay.',
        'We stock only parts we would put in our own machines, publish honest pricing including VAT, and build every system in-house before it ships.',
      ],
      cta: { heading: 'See what you can build', url: '/builder', label: 'Open the builder' },
    },
    {
      title: 'Contact',
      slug: 'contact',
      description: 'How to reach the BuildMyRig team.',
      paragraphs: [
        'Email: support@buildmyrig.test — we reply within one working day, Monday to Friday.',
        'Order questions include your order number so we can pull it up immediately. Press and partnership enquiries: partners@buildmyrig.test.',
      ],
      cta: { heading: 'Prefer self-service?', url: '/faq', label: 'Check the FAQ' },
    },
    {
      title: 'Terms of service',
      slug: 'terms',
      description: 'Terms and conditions for BuildMyRig orders.',
      paragraphs: [
        'These terms govern purchases from BuildMyRig. By placing an order you confirm you are at least 18 years old or have parental consent.',
        'Prices include VAT. Titles of components pass on full payment; systems remain subject to our 24-month build warranty terms.',
        'We may refuse orders where stock, pricing errors, or suspected fraud make fulfilment impossible; any payment is refunded within 5 working days.',
      ],
      cta: { heading: 'Questions about an order?', url: '/contact', label: 'Contact us' },
    },
    {
      title: 'Privacy policy',
      slug: 'privacy',
      description: 'How BuildMyRig handles your data.',
      paragraphs: [
        'We collect only what an order needs: name, email, shipping address, and payment confirmations (card data never touches our servers — payments run through Stripe).',
        'Newsletter subscription is double opt-in and can be cancelled from any email. You can request export or deletion of your data by emailing privacy@buildmyrig.test.',
        'We use cookies for cart persistence and anonymous traffic analytics. No third-party advertising trackers.',
      ],
      cta: { heading: 'Read the terms', url: '/terms', label: 'Terms of service' },
    },
  ]) {
    await createPage({
      title: pageDef.title,
      slug: pageDef.slug,
      _status: 'published',
      seo: { title: pageDef.title, description: pageDef.description },
      layout: [
        { blockType: 'richText', richtext: rt(pageDef.paragraphs) },
        // Entry 23: /contact gets the form block (07-ux-plan.md).
        ...(pageDef.slug === 'contact'
          ? [
              {
                blockType: 'contactForm',
                heading: 'Send us a message',
                intro: 'Questions about a build or an order? Write to us — we reply within one working day, Monday to Friday.',
              },
            ]
          : []),
        {
          blockType: 'ctaBanner',
          heading: pageDef.cta.heading,
          ctaLabel: pageDef.cta.label,
          ctaUrl: pageDef.cta.url,
          tone: 'dark',
        },
      ],
    })
  }

  return created
}
