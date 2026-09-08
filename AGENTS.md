# Bleed Air & Pressurization Lab

Independent React / TypeScript / Vite static application. Keep all work inside this directory; sibling labs are independent.

- Simulation logic belongs in `src/sim/engine.ts`, separate from UI. One shared `AircraftState` drives all pages.
- Learner explanations are Turkish; preserve standard English aircraft component identifiers.
- Never add random system values or animations for zero / invalid flow paths. Respect actual signed branch flow and paused / reduced-motion state.
- Keep generic-architecture and educational-model boundaries visible. Do not invent aircraft-specific limits.
- Keep `.env*` and credentials untouched. No backend or external runtime requests are necessary.
- Run `npm test`, `npm run typecheck`, `npm run format:check`, and `npm run build` for meaningful model / UI changes. Use `tests/browser_check.py` for browser acceptance with the local dev server.
- Release artifacts are `dist/`, with relative base paths. Verify a real public URL before describing any future deployment as complete.
- Single agent by default. Subagents require explicit user authorization.
