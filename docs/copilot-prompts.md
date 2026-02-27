# Copilot Prompts for ProceduralCityVue

Note: Project uses Vue 2 + Vue CLI and Three.js. Prefer small, reviewable changes and include a concise change explanation (one-line + 2 bullets) with every Copilot-produced patch.

## 0 — Project summary (use before other prompts)
Prompt:
"Summarize this project in 4–6 lines for a contributor. Use package.json, mention Vue 2, Vue CLI, Three.js, `src/views/Scene.vue`, `src/components/settings/` and `src/utils/`. Include any special npm scripts (serve/build/lint) and note the `NODE_OPTIONS=--openssl-legacy-provider` usage."

Expected output: 4–6 line architecture summary.

## 1 — Scaffold a Vue 2 component (paired JS/SCSS pattern)
Prompt:
"Create a Vue 2 single-file component scaffold named <ComponentName> using the repo's pattern (external `<ComponentName>.js` and `<ComponentName>.scss`). Output a brief diff that adds: `<path>/<ComponentName>.vue`, `<path>/<ComponentName>.js`, and `<path>/<ComponentName>.scss`. Ensure compatibility with `vue-template-compiler@2.x`. At the top of the diff, include a one-line change explanation and two bullets: files touched, reason."

## 2 — Refactor extraction
Prompt:
"In `<filePath>` extract the block starting at <startContext> into a new helper named `<helperName>` in `src/utils/<helperName>.js`. Provide a patch-style diff, a one-line rationale, and a 2-item test checklist (manual or unit). Ensure no Vue 3 syntax."

## 3 — Bug triage & minimal fix
Prompt:
"Given these repro steps: <steps>, propose the smallest possible fix, show the diff, and include one-line summary + 2 bullets (files touched, why). Add a short manual verification list."

## 4 — Add a unit test for a util
Prompt:
"Add a minimal unit test for `src/utils/<util>.js` that verifies <behavior>. If `package.json` has no `test` script, also propose a minimal `test` script and explain how to run it."

## 5 — Lint autofix
Prompt:
"Run lint autofix suggestions for changes in <filePath>. Show only the fixes you propose in a diff and include the one-line + 2-bullet change explanation."

## 6 — Generate commit / PR message
Prompt:
"Given the changes (list files and brief intent), produce a commit message: subject line <=72 chars, and body that follows the 'change explanation template' (one-line summary + 2 bullets: files touched, why)."

## 7 — README change
Prompt:
"Edit README.md to add a short 'Copilot & prompts' section linking to `copilot-instructions.md` and `docs/copilot-prompts.md`. Show the exact patch and the change explanation (one-line + 2 bullets)."

## 8 — CI proposal (GitHub Actions)
Prompt:
"Propose a minimal GitHub Actions workflow that runs install, `npm run lint`, and `npm run build` on pushes to `main` and on PRs. Keep it small; return the workflow YAML and the one-line change explanation."

## 9 — Three.js prototype
Prompt:
"Scaffold a minimal Three.js prototype component (Vue 2) demonstrating a rotating cube, put it in `src/views/prototype/RotatingCube.vue`. Keep it isolated and compatible with the repo's `three` version. Provide diff and change explanation."

## 10 — Enforce constraints
Prompt:
"When producing code for this repo, always enforce: Vue 2 syntax only, avoid bumping major dependency versions, and keep changes small. If a suggested change upgrades a major dep, refuse and explain what would be required."
