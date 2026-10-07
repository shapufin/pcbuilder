---
description: "Security/access pointer — roles, CSRF, rate limits, auth"
trigger: glob
globs: "**/collections/**, apps/web/src/{lib/{auth,password-reset}.ts,proxy.ts,payload.config.ts,app/(frontend)/{auth,account,api/auth}/**}"
---

Touching access control, auth, or collections — read
`.devin/context/03-security-access.md` first (roles matrix, Origin
allowlist on GETs too, XFF contract, anti-enumeration).
