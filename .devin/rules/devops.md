---
description: "DevOps/gates pointer — CI, env, deps, schema push"
trigger: glob
globs: ".github/**, turbo.json, pnpm-workspace.yaml, scripts/**, **/payload.config.ts, .env*"
---

Touching CI, env, dependencies, or payload config — read
`.devin/context/05-devops-gates.md` first (turbo env allowlists,
push-on-dev-boot, override pins, currency policy).
