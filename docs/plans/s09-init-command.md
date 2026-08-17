---
validated: yes
---

# Plan — Story s09-init-command

Branch: `feature/s09-init-command`
Research: `docs/research/s09-init-command.md` — read it first; this plan does not repeat its findings (two-source assembly, include/exclude table, AC4 residue sites).

## Target story

`init <name>`: scaffold a new SaaS from the `ui-starter` base with the killer-saas pipeline pre-wired.

- **AC1** — `init <name>` produces a new project folder that builds and starts without error.
- **AC2** — generated project contains the pipeline (`templates/`, `.claude` commands, `AGENTS.md`) and `/ks-status` runs inside it.
- **AC3** — generated project ships a placeholder palette ready to re-theme (s02). _Already true — neutral `pine`/`lime` VALUES in `app/globals.css` carry over untouched._
- **AC4** — NO Applyzi-specific artifacts in the generated project.

Complexity: **3** (research verdict). Node 22 stdlib only, no new dep, pure-core + fs-shell script.

## The settled AC4 decision (load-bearing)

s09 reads AC4 as **"no killed-domain string anywhere the fork carries"** and closes it at TWO layers:

1. **Scrub the STARTER SOURCE** so `git grep -i applyzi` over `ui-starter/` (modulo token-guard test fixtures) is empty — both the starter and any copy are clean.
2. **`shouldInclude` drops** the s01–s08 story docs + framing docs (the bulk of the remaining `applyzi` hits) and `.env.local` secrets, so the generated tree never receives them.

**Explicitly OUT of scope** (would push complexity to 4): renaming the `pine`/`lime` design **tokens**. Their VALUES are already neutral (slate/indigo); a name rename touches every `bg-pine`/`text-lime` utility across `app|components|lib` in lockstep and is gated by `check-design-tokens` — a distinct concern. Leave a one-line note pointing at a future `s09b-neutralize-token-names` story; do NOT rename tokens here.

## Tasks (ordered)

### 1. Scrub the AC4 residue in the starter source (comments / script / favicon / dead eslint rule only)

Neutralise each site below to domain-neutral wording. Touch ONLY comments, the shell script, the favicon `<!-- -->` title, and the dead eslint block — NO rendered logic, NO token rename.

1. [x] `app/globals.css:12` — drop the `CV artifact: … NEVER lime (see CvPreview)` register line from the header comment; keep the neutral "App chrome / re-theme in 1 step" guidance.
2. [x] `app/globals.css:28` — comment `/* faint secondary text (CV artifact) */` → `/* faint secondary text */`.
3. [x] `app/globals.css:255` — onboarding keyframes comment `(fichier → flux → Applyzi)` → domain-neutral (e.g. `(fichier → flux → app)`). Keep the motion description.
4. [x] `components/cookie-banner.tsx:9` — comment `Applyzi utilise des cookies…` → neutral subject (e.g. `Cette app utilise des cookies…`). Comment only; the component renders i18n keys, no rendered change.
5. [x] `public/favicon.svg:3` — `<!-- Applyzi — favicon / app icon. Tuile carrée pine… -->` → neutral (`<!-- favicon / app icon. -->`). Do NOT touch the `fill=` values (guarded by `check-design-tokens`'s SVG raw-hex allowance — leave the paths/rects byte-identical).
6. [x] `scripts/backup-prod.sh` — dropped entirely (Applyzi-prod-specific infra, no value in a neutral starter). Simpler alternative taken per plan permission.
7. [x] `eslint.config.mjs:30-35` — remove the dead override block `files: ["components/app/cv-builder/preview.tsx"]` (the path does not exist in the fork). Also drop the `Typst compile` mention in the `react-hooks/set-state-in-effect` comment (`eslint.config.mjs:26`) → neutral wording; keep the rule. Verify `npm run lint` still parses after removal.
8. [x] Re-run `git grep -in applyzi -- . ':!docs/' ':!*.test.ts'` and `git grep -inE 'cvpreview|cv-builder|cv artifact|typst' -- . ':!docs/'` — must be **empty**. The ONLY surviving `applyzi` hits allowed outside `docs/` are the three GUARD test fixtures (`components/brand/logo.test.ts`, `messages/auth.test.ts`, `messages/legal.test.ts`) which assert the string is absent — leave them untouched. `AGENTS.md:65,83` also legitimately name the fork origin/graveyard; those stay (project rules doc, not shipped app copy).

### 2. `scripts/init.mjs` — pure core + fs shell (Node 22 stdlib only)

Sibling of `scripts/check-design-tokens.mjs`, same `#!/usr/bin/env node` header + JSDoc-block style. `node:fs` / `node:path` / `node:child_process` only. Factor the logic into PURE, exported, testable functions:

9. [x] `isValidProjectName(raw): boolean` — reject empty/whitespace-only, path separators (`/`, `\`), `..`, leading `.`, uppercase, spaces, and any char outside npm-name rules (`[a-z0-9][a-z0-9-]*`). Pure, no fs.
10. [x] `slugifyProjectName(raw): string` — lowercase, trim, spaces/underscores → `-`, strip disallowed chars, collapse repeats. Output must satisfy `isValidProjectName`. Pure.
11. [x] `shouldInclude(relPath): boolean` — the copy filter. Pure string predicate over a repo-relative path. Encodes:
    - **EXCLUDE** (never copy): any segment `.git/`, `node_modules/`, `.next/`, `dist/`, `coverage/`, `.turbo/`; files `*.tsbuildinfo` (incl. `tsconfig.tsbuildinfo`), `.DS_Store`, `*.log`, and **`.env.local`** (real secrets — exclude the exact file, NOT the `.example`).
    - **INCLUDE the dotfiles a naive glob drops**: `.gitignore`, `.dockerignore`, `.prettierignore`, `.prettierrc.json`, `.nvmrc`, `.husky/` (contents), and **`.env.local.example`** (kept).
    - **docs/ story history**: DROP `docs/research/`, `docs/plans/`, `docs/reviews/` (s01–s08) and RESET framing docs `docs/{prd,stories,architecture,design-system,theming}.md` (Applyzi-specific + the `applyzi` grep source). KEEP `docs/decisions/` (structural ADRs apply to any fork). _(Note: `docs/templates/` does not exist in this repo — the pipeline `templates/` live at the `ui-starter/` root, copied via the tree walk; do not invent a `docs/templates/` path.)_
    - Source of truth for the exclude set: `.gitignore` + `.dockerignore`. `shouldInclude` is deny-list first, then the dotfile allow-list, then default-allow.
12. [x] The imperative shell (`main()`, guarded by `import.meta.url` entry check so importing the module for tests has no side effect):
    - Parse `<name>` from `process.argv`; `slugify` + validate; **refuse if `<target>` dir already exists** (no clobber) and print a clear error.
    - Copy the `ui-starter/` tree → `<target>` via `fs.cpSync(root, target, { recursive, filter })` where `filter` calls `shouldInclude(path.relative(root, src))`.
    - Copy the parent pipeline `../.claude/` → `<target>/.claude` (the ks-\* commands the `ui-starter/` tree lacks — research fact 1). `templates/` + `AGENTS.md` already live under `ui-starter/` and arrive via the tree copy.
    - Rewrite the generated `package.json` `name` field → the slug (read, `JSON.parse`, set `.name`, write back with a trailing newline).
    - Reset/seed `docs/` framing: ensure empty `docs/{research,plans,reviews}/` exist (so `/ks-status` degrades gracefully per `ks-status.md`); leave framing `.md` either absent or reset-to-template. Keep `docs/decisions/`.
    - `git init` a FRESH repo in `<target>` (`execSync('git init …', { cwd: target })`) with one initial commit — NO inherited history (the source `.git/` was excluded).
    - Print next steps: `cd <name> && npm install && npm run build`, then `/ks-status`.

### 3. Package wiring

13. [x] Add `"init": "node scripts/init.mjs"` to `package.json:scripts` so the story's "one command" is `npm run init <name>` (dep-free; matches the `check-design-tokens` sibling pattern). Do NOT add a `bin`/npx surface or any dependency — the plain script is the pinned invocation. (A `bin` alias is a future one-line add if the plugin framing needs `npx`.)

### 4. Tests — `scripts/init.test.ts` (Vitest, colocated, `*.test.ts` convention)

Unit-test the PURE functions only (import from `init.mjs`; the entry guard keeps import side-effect-free):

14. [x] `isValidProjectName` — valid (`my-app`, `saas2`) pass; invalid (``, ` `, `My App`, `../evil`, `a/b`, `.hidden`, `UPPER`) fail.
15. [x] `slugifyProjectName` — `"My New SaaS"` → `my-new-saas`; result always satisfies `isValidProjectName`.
16. [x] `shouldInclude` — assert the EXCLUDE list: `.git/config`, `node_modules/x`, `.next/x`, `dist/x`, `tsconfig.tsbuildinfo`, `coverage/x`, `foo.log`, `.DS_Store`, and **`.env.local` EXCLUDED**. Assert the INCLUDE list: `.gitignore`, `.dockerignore`, `.prettierrc.json`, `.nvmrc`, `.husky/pre-commit`, and **`.env.local.example` INCLUDED**. Assert `docs/decisions/001-*.md` INCLUDED but `docs/plans/s01-*.md` / `docs/research/s01-*.md` EXCLUDED.
17. [x] Do NOT weaken or touch the existing guard suites (`components/brand/logo.test.ts`, `messages/{auth,legal}.test.ts`) — they must stay green as-is after the scrub.

## Run interdicts

- The scrub (task 1) touches ONLY comments / `backup-prod.sh` / `favicon.svg` title / the dead eslint block — NO rendered logic, NO token rename, NO screen rewrite. `check-design-tokens.mjs` must stay green (verify `npm run lint:design`).
- Do NOT rename the `pine`/`lime` tokens or edit any `--color-*` VALUE. AC3 depends on them carrying over unchanged.
- `init.mjs` uses Node 22 stdlib ONLY — no new npm dependency, no `bin`.
- The generated project must NOT contain `.env.local` (secrets), `.git/` (inherited history), `node_modules/`, `.next/`, `dist/`, `coverage/`, or `*.tsbuildinfo`. The generated project MUST contain `.claude/` (ks-\* commands) + `templates/` + `AGENTS.md` so `/ks-status` runs (AC2).
- Do NOT touch `proxy.ts`, the Stripe webhook, or `check-design-tokens.mjs` logic. Do NOT weaken any existing test (guards must stay green).
- `git grep -in applyzi -- . ':!docs/' ':!*.test.ts'` must be empty after task 1 (modulo `AGENTS.md` fork-origin/graveyard lines).

## The point everything turns on

The one decision: **AC4 is closed by scrubbing the starter source + dropping story/framing docs & secrets in `shouldInclude`, NOT by renaming tokens.** Three places it could be wrong, and what to check each against:

1. **`shouldInclude`'s dotfile allow-list.** A naive `filter` that skips all `.`-prefixed paths silently drops `.gitignore`/`.env.local.example`/`.husky/` and the generated project breaks (no ignore rules, no example env). Check: the test in task 16 asserts each must-include dotfile explicitly, and that `.env.local` is excluded while `.env.local.example` is included.
2. **The two-source assembly.** `.claude/` is NOT under `ui-starter/` (research fact 1) — copying only "this repo" yields a project where `/ks-status` has no commands. Check: after copy, `<target>/.claude/commands/ks-status.md` must exist (AC2). Compare against `../.claude/` contents.
3. **The `backup-prod.sh` scrub vs drop, and the eslint dead-rule removal.** If the block is kept unscrubbed, `git grep -i applyzi` stays non-empty (AC4 fails); if the eslint `files:` path is left, it's dead config. Check: the grep interdict + `npm run lint` still parsing.

## Files touched

- `app/globals.css` (comments only — lines 12, 28, 255)
- `components/cookie-banner.tsx` (comment only — line 9)
- `public/favicon.svg` (title comment only — line 3)
- `scripts/backup-prod.sh` (comments + `OUT=` prefix, or dropped)
- `eslint.config.mjs` (remove dead `cv-builder` override + Typst comment)
- `scripts/init.mjs` (NEW — the scaffold script)
- `scripts/init.test.ts` (NEW — unit tests for the pure core)
- `package.json` (add `"init"` script)
- `docs/plans/s09-init-command.md` (this plan) + `docs/research/s09-init-command.md` (travels in the commit)

## Test strategy

- **Automated (Vitest, this repo):** the PURE core — `isValidProjectName`, `slugifyProjectName`, `shouldInclude` (the full include/exclude table). This is the honest altitude: the filter + validators are where the logic lives; the fs side-effects are thin `cpSync`/`execSync` calls.
- **NOT verified in this environment (human step):** a full scaffold + `npm install` + `npm run build` + `npm start` + running `/ks-status` inside the generated project. State the exact commands (below) in the review as the human check. Consistent with how s01/s06 handled runtime ("Not verified").

## AC verification notes

- **AC1** (builds/starts) — human: `npm run init demo-app && cd ../demo-app && npm install && npm run build && npm start`. `prebuild` `check-design-tokens` must pass; env is read lazily so no real secrets needed (`.env.local.example` placeholders suffice).
- **AC2** (`/ks-status` runs inside) — human: in the generated project, confirm `.claude/commands/ks-status.md`, `templates/`, `AGENTS.md` exist, then run `/ks-status` — it should report an un-framed project (empty `docs/`), which is the correct fresh state.
- **AC3** (placeholder palette) — already holds; neutral `pine`/`lime` VALUES carry over untouched. No task needed beyond NOT breaking it.
- **AC4** (no Applyzi artifacts) — closed by task 1 (source scrub) + `shouldInclude` dropping story/framing docs & `.env.local`. Reviewer verifies `git grep -i applyzi` over the generated tree is empty (modulo the guard test fixtures and `AGENTS.md` origin lines).

## Definition of Done

- Single PR (`feature/s09-init-command`), readable diff, structured description.
- `scripts/init.test.ts` green; no regression in the existing guard/test suites; `npm run lint` + `npm run lint:design` green.
- `git grep -in applyzi -- . ':!docs/' ':!*.test.ts'` empty (modulo `AGENTS.md`).
- Review passed (no open critical). Human AC1/AC2 scaffold check recorded as "Not verified" in the review with the exact commands.
- One story commit bringing research + this plan + the implementation.
