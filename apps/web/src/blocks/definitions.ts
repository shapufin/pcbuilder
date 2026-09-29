import type { Block } from 'payload'

/**
 * The 12 v1 blocks (docs/buildmyrig-plan/10-blocks-pages.md).
 * Slug names are the registry keys — registry.tsx maps them to components.
 */

export const HeroBlock: Block = {
  slug: 'hero',
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'subheading', type: 'text' },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    {
      name: 'videoUrl',
      type: 'text',
      admin: { description: 'YouTube or Vimeo URL — used when variant = video' },
    },
    { name: 'variant', type: 'select', options: ['image', 'split', 'video'], defaultValue: 'image' },
    { name: 'align', type: 'select', options: ['left', 'center'], defaultValue: 'center' },
    {
      name: 'ctas',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'style', type: 'select', options: ['primary', 'secondary'], defaultValue: 'primary' },
      ],
    },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  fields: [{ name: 'richtext', type: 'richText', required: true }],
}

export const ProductGridBlock: Block = {
  slug: 'productGrid',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'limit', type: 'number', defaultValue: 4, min: 1, max: 12 },
    { name: 'columns', type: 'select', options: ['2', '3', '4'], defaultValue: '3' },
    { name: 'viewAllLabel', type: 'text', defaultValue: 'View all' },
  ],
}

export const FeaturedCategoryBlock: Block = {
  slug: 'featuredCategory',
  fields: [
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    { name: 'heading', type: 'text', required: true },
    { name: 'copy', type: 'textarea' },
    { name: 'ctaLabel', type: 'text', defaultValue: 'Shop now' },
  ],
}

export const CtaBannerBlock: Block = {
  slug: 'ctaBanner',
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'copy', type: 'textarea' },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaUrl', type: 'text' },
    { name: 'tone', type: 'select', options: ['dark', 'indigo', 'slate'], defaultValue: 'indigo' },
  ],
}

export const TemplatesCarouselBlock: Block = {
  slug: 'templatesCarousel',
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Ready-to-go builds' },
    { name: 'tagFilter', type: 'text' },
    { name: 'autoplay', type: 'checkbox', defaultValue: false },
  ],
}

export const ComparisonTableBlock: Block = {
  slug: 'comparisonTable',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'columns',
      type: 'array',
      required: true,
      minRows: 2,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'rows',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'values', type: 'array', fields: [{ name: 'value', type: 'text' }] },
      ],
    },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Frequently asked questions' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'richText', required: true },
      ],
    },
  ],
}

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'What builders say' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text' },
        { name: 'avatar', type: 'relationship', relationTo: 'media' },
      ],
    },
  ],
}

export const LogosStripBlock: Block = {
  slug: 'logosStrip',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'brands', type: 'relationship', relationTo: 'brands', hasMany: true },
  ],
}

export const NewsletterSignupBlock: Block = {
  slug: 'newsletterSignup',
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Get build deals in your inbox' },
    { name: 'consent', type: 'text', defaultValue: 'No spam — unsubscribe anytime.' },
  ],
}

export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  fields: [
    { name: 'provider', type: 'select', options: ['youtube', 'vimeo'], defaultValue: 'youtube' },
    { name: 'url', type: 'text', required: true },
    { name: 'poster', type: 'relationship', relationTo: 'media' },
    { name: 'title', type: 'text', defaultValue: 'Video' },
  ],
}

export const pageBlocks: Block[] = [
  HeroBlock,
  RichTextBlock,
  ProductGridBlock,
  FeaturedCategoryBlock,
  CtaBannerBlock,
  TemplatesCarouselBlock,
  ComparisonTableBlock,
  FaqBlock,
  TestimonialsBlock,
  LogosStripBlock,
  NewsletterSignupBlock,
  VideoEmbedBlock,
]
