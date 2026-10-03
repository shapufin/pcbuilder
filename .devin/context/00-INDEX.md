# .devin/context — index

Lazy domain context for BuildMyRig. Read the file matching your task's
keywords (router table in `AGENTS.md` / `.devin/rules/CONTEXT.md`).
Every file answers: what must be true, where it lives, what must not be
done, which command/test verifies it. Depth lives in
`docs/buildmyrig-plan/` — these files hold operational facts only.

| File | Domain | Read when the task touches |
| --- | --- | --- |
| [01-commerce.md](01-commerce.md) | Orders, payments, emails, cart/checkout | Stripe, webhook, order, transaction, cart, checkout, Resend, email, inventory |
| [02-builder.md](02-builder.md) | Rule engine, builder data shapes, admin rule UI | rule, compatibility, component, template, configured-build, socket, wattage, RuleManager, builder-index |
| [03-security-access.md](03-security-access.md) | Roles, access matrix, CSRF, rate limits | role, access, permission, CSRF, Origin, rate limit, XFF, upload, login, register, password |
| [04-cms-pages-theme.md](04-cms-pages-theme.md) | Pages, blocks, theme, site settings | page, block, Section, Lexical, theme, token, CSS var, site-settings, SEO, sitemap |
| [05-devops-gates.md](05-devops-gates.md) | Commands, CI, env, deps, DB push | build, test, lint, typecheck, CI, env var, turbo, pnpm, Docker, upgrade, dependency, schema push |
| [06-gotchas.md](06-gotchas.md) | Hard-won platform/tooling traps | debugging, PowerShell, probe failures, zustand, vitest, Playwright, payload REST quirks |

Maintenance contract: when a change makes one of these files wrong,
fix the file in the same round. When a file passes 400 lines, split —
never raise the limit. `pnpm workflow:check` verifies indexing.
