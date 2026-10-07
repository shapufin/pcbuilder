---
description: "Commerce domain pointer — orders, payments, emails, cart"
trigger: glob
globs: "packages/plugin-shop/**, apps/web/src/app/(frontend)/{cart,checkout}/**, apps/web/src/components/{EcommerceShell,CartDrawer}.tsx"
---

Working in commerce code — read `.devin/context/01-commerce.md` before
changing behavior (CAS settlement, staff-status access, Resend contract,
cart depth/`cartID` traps).
