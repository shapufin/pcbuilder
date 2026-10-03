---
description: "Agent dispatch roster — consult when a task could be delegated to a specialist subagent"
trigger: model_decision
---

# Agent roster — BuildMyRig

### Roster

| Agent | Owns | Reads first | Does NOT |
| --- | --- | --- | --- |
| Builder/rules engineer | `packages/lib`, `packages/plugin-pc-builder` | `context/02-builder.md`, `docs/…/06-rule-engine.md` | payments, emails, storefront UI |
| Commerce engineer | `packages/plugin-shop`, orders/webhooks/emails/cart | `context/01-commerce.md`, `03-security-access.md` | builder internals |
| Storefront engineer | `apps/web` routes/components/blocks/theme | `context/04-cms-pages-theme.md`, `docs/…/07-ux-plan.md` | collection access logic |
| Reviewer (read-only) | `code-review-checklist`; +`security-review` on auth/payments | the task's domain context file | edit code; verdict without `file:line` findings |
| Test/release engineer | gates, CI, e2e, loadtest, seeds, `workflow:check` | `context/05-devops-gates.md` | feature code |

### Dispatch rules

- One agent is usually enough for a focused task — dispatch on real
  boundary crossings only, not for ceremony.
- Implementation agents write; the Reviewer never does. Final decision
  and verification stay in the primary session.
- Give every dispatched agent: exact file paths, the context file to
  read, and what to return — they see none of this conversation.
- Parallel only when tasks are disjoint (no shared files/state).

### Dispatch table

| Task type | Lead | Support |
| --- | --- | --- |
| Rule/engine/endpoint change | Builder/rules | Reviewer |
| Order/email/checkout change | Commerce | Reviewer + security-review |
| New page/block/theme/route | Storefront | Reviewer |
| Access/roles/CSRF change | Commerce or Builder (by collection) | Reviewer (security-review mandatory) |
| CI/env/dep/upgrade work | Test/release | — |
| Cross-plugin feature | nearest-domain lead | second domain agent, then Reviewer |
