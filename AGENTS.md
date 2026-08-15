# Readiver Repository Instructions

1. Read `docs/PRODUCT.md` before implementing product behavior.
2. Read `docs/BRAND_BOOK.md` before implementing or changing UI.
3. Read `docs/ARCHITECTURE.md` before architectural changes.
4. Read `docs/API.md` before changing client/backend contracts.
5. Never call an AI provider directly from web or iOS.
6. Keep iOS native SwiftUI.
7. Keep web Next.js + TypeScript.
8. Both clients must use the same backend contracts.
9. Treat the backend as the source of truth for AI adaptation behavior.
10. Do not introduce new visual conventions without updating `BRAND_BOOK.md`.
11. Do not add speculative features.
12. Avoid premature abstraction.
13. Prefer simple, readable, maintainable code.
14. Never commit production secrets.
15. Use environment variables for secrets and environment-specific configuration.
16. Run relevant builds, tests, linting, and type checks before declaring work complete.
17. If environment limitations prevent validation, say exactly what was not validated.
18. If a requested change conflicts with the documented architecture, flag it instead of silently bypassing the architecture.
19. When the user gives a product-level request, determine all required web, iOS, backend, database, testing, and documentation changes yourself.
20. Do not ask the user to split normal product requests into separate backend/web/iOS tasks unless a real product decision is required.
21. Preserve the clean editorial visual direction. Do not produce generic AI-style UI.
22. Keep the MVP intentionally small until product validation justifies expansion.
