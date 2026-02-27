# Copilot Instructions — ProceduralCityVue

Purpose
- Treat Copilot as a helpful pair-programmer for this hobby project. Keep changes small, reviewable, and documented.

Quick locations
- Prompts: [docs/copilot-prompts.md](docs/copilot-prompts.md)
- Key files to check: [package.json](package.json), [src/main.js](src/main.js), [src/views/Scene.vue](src/views/Scene.vue), [src/components/settings/settings.js](src/components/settings/settings.js), [src/components/settings/settings.vue](src/components/settings/settings.vue), [src/utils/gridSetup.js](src/utils/gridSetup.js)

Constraints (must follow)
- Do not upgrade dependency major versions without explicit approval.
- When a component pattern uses paired files (e.g., `settings.vue` + `settings.js` + `settings.scss`) update all related files together.

Do not commit or make PRs. This is a hard requrement
Copilot is not allowed to make commits or Pull requests ever. Do not try.

Required change explanation (must be included with every Copilot-generated change)
- Title: one-line summary (imperative)
- Bullets:
  - Files: list files changed
  - Why: one short sentence explaining the intent
- Optional: 1–2 verification steps (commands or manual steps)


Linting & testing
- Lint: `npm run lint` (project uses Vue CLI lint config).
- If you add tests, also add a `test` script to `package.json` (keep testing minimal and Node 14+ compatible).

Where to extend
- Put additional prompts in `docs/copilot-prompts.md`.
- Consider adding `.github/PULL_REQUEST_TEMPLATE.md` that enforces the change explanation template (optional for single-developer projects).

Example (how Copilot should format):
Fix settings panel toggle behavior
- Files: src/components/settings/settings.js, src/components/settings/settings.vue
- Why: Ensure toggle updates store and dispatches scene refresh
- Verify: Open dev server, toggle panel, observe scene update

If you want, I can:
- Add a small README update linking these docs,
- Or generate a local test scaffold for `src/utils` functions.
