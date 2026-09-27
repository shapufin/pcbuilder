# 04 · Collections — Platform (Media, SEO, Redirects, Pages, Reviews Phase 2)

## Media

`@payloadcms/storage-s3` for S3-compatible storage (https://payloadcms.com/docs/upload/storage-s3). Auto sizes (image tooling generates named variants).

| Field | Type | Notes |
| --- | --- | --- |
| filename / alt / mimeType / filesize | upload defaults | alt required for a11y |
| focalPoint | upload field | next/image uses Payload sizes |

sizes config: `card` (600×400), `gallery` (1200), `hero` (1920), `thumb` (240). Upload validation: mime whitelist jpeg/png/webp/avif, max 8MB. Access: public read, staff write.

## SEO (`@payloadcms/plugin-seo`)

Fields per collection (Products, Categories, Pages, BuildTemplates): `seo.title` (70 char), `seo.description` (155), `seo.image`. Collection-level defaults set in plugin options; `generateURL` bound to `BMR_URL` env (https://payloadcms.com/docs/plugins/seo). Access: inherited.

## Redirects (`@payloadcms/plugin-redirects`)

| Field | Type |
| --- | --- |
| from | text (indexed) |
| to | text |
| type | 301 / 302 |

Access: admin/manager write, public none.

## Pages (block-composed)

See [../10-blocks-pages.md](../10-blocks-pages.md) for the 12-block set and `blockToComponent` registry.

| Field | Type | Notes |
| --- | --- | --- |
| title / slug | text | unique indexed |
| layout | blocks field (12 block types) | https://payloadcms.com/docs/fields/blocks |
| seo | seo field | |
| isHomepage | checkbox (unique true) | exactly one page renders `/` |

Access: public read (published), admin/manager write. Drafts on, live preview enabled.

## Reviews (Phase 2)

| Field | Type | Notes |
| --- | --- | --- |
| product | rel → products | |
| user | rel → users | |
| rating | number (1–5) | |
| body | textarea | |
| moderationStatus | pending / approved / rejected | |

Access: authenticated create (own), staff moderate, public read approved only. Hook: approve → recompute product ratingAggregate.
