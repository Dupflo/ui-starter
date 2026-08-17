# Research — Story s09-init-command

## The five structuring facts

1. **The starter to copy IS this repo (`ui-starter/`), and it is its own git repo; the pipeline files live ONE level up at the yzi-suite root, NOT in `ui-starter/`.** `git -C ui-starter rev-parse --show-toplevel` → `ui-starter`; the root is not a git repo. `ui-starter/.claude/` **does not exist** (only `ui-starter/templates/` + `ui-starter/AGENTS.md` do). The full `.claude/` bundle is at `/Users/florian/.../yzi-suite/.claude/` (14 commands + 5 skills + 3 agents + `.ks-manifest` + `.ks-version`). So init must assemble from **two sources**: the `ui-starter/` tree (the app) + the yzi-suite-root `.claude/` (the pipeline). See `ui-starter` vs root `ls -la`.

2. **`/ks-status` is self-contained — it needs only `docs/` + git, no skills/agents.** `.claude/commands/ks-status.md:3-7` declares `allowed-tools: Read/Glob/Grep/Bash`; grep for `skill|subagent|agents/` in it → nothing. AC2 ("/ks-status s'exécute dedans") is satisfied by copying `.claude/commands/ks-status.md` + a fresh `docs/` skeleton. But AC2 also literally requires the _pipeline_ (templates/, `.claude` commandes, AGENTS.md), so the honest scope is the **whole** `.claude/` per the manifest — the full pipeline, not just ks-status.

3. **`init <name>` has no host yet — `package.json` has no `bin` and no `init` script** (`package.json:8-20`: dev/build/lint/test only). The script must be created (recommend `scripts/init.mjs`, run `node scripts/init.mjs <name>`), living in `ui-starter/scripts/` next to the existing `check-design-tokens.mjs`.

4. **AC4 is NOT clean today: killed-domain vocabulary survives in the committed s08 tip.** Token _values_ are neutral (slate/indigo: `--color-lime: #818cf8`, `app/globals.css:16-18`) but token _names_ `pine`/`lime` remain, the header comment still says "CV artifact … NEVER lime (see CvPreview)" (`app/globals.css:11-12`), and 8 `Applyzi` string carries live in comments/scripts (`globals.css:255`, `cookie-banner.tsx:9`, `scripts/backup-prod.sh:5,11,20,21,42`, `public/favicon.svg:3`) plus a **dead** eslint rule targeting a non-existent path `components/app/cv-builder/preview.tsx` (`eslint.config.mjs:33`; the dir doesn't exist). The s01 review knew this: it lists these as unresolved _minors_ (`docs/reviews/s01-base-fork.md`, "Remaining minors"). A raw copy propagates all of it.

5. **Build/start needs no real secrets — env is read lazily inside handlers, not at module top-level.** All `process.env` sites (`lib/supabase/client.ts:9`, `server.ts:12`, `service-role.ts:10`, `lib/stripe/*`, `app/api/webhooks/stripe/route.ts:19`) run at request time; Next SSG build does not evaluate them. `.env.local.example` (Supabase + Stripe placeholders) is enough for `npm install && npm run build`. `prebuild` runs `check-design-tokens.mjs` (`package.json:10`) — passes on the current tree, and must keep passing in the generated project.

## Target story

`init <name>`: scaffold a new SaaS from the `ui-starter` base with the killer-saas pipeline pre-wired. AC:

1. `init <name>` → a new project folder that builds and starts without error.
2. Generated project contains the pipeline (`templates/`, `.claude` commands, `AGENTS.md`) and `/ks-status` runs inside it.
3. Generated project has a placeholder palette ready to re-theme (s02).
4. NO Applyzi-specific artifacts in the generated project.

Depends on s01–s08 (starter must be complete). Story score: 3.

## Current state of the code

- **App tree (`ui-starter/`)**: complete Next 16 SaaS after s01–s08 — `app/`, `components/`, `lib/`, `i18n/`, `messages/`, `supabase/`, `scripts/{check-design-tokens.mjs,backup-prod.sh}`, `proxy.ts`, config files, `templates/`, `AGENTS.md`, `docs/`. Its own `.git`.
- **Pipeline (yzi-suite root)**: `.claude/{commands(14 ks-*),skills(5),agents(3),.ks-manifest,.ks-version}`, root `templates/` (11 files, identical set to `ui-starter/templates/`), root `AGENTS.md`, `.killer-saas/templates.orig/`.
- **`ui-starter/docs/`**: framing docs (`prd.md`, `stories.md`, `architecture.md`, `design-system.md`, `theming.md`) + `decisions/` (5 ADRs) + `research|plans|reviews/` for s01–s08 + `reviews/stories.md`. These are _this starter's_ build history.
- No `bin`, no `init` script, no scaffolding code exists yet.

## Anchor points

- **New script**: `ui-starter/scripts/init.mjs` (sibling of `check-design-tokens.mjs`). Invocation `node scripts/init.mjs <name>` (optionally add `"init": "node scripts/init.mjs"` to `package.json:scripts` and/or a `bin` so `npx`/plugin can call it — matches PRD "plugin `init` en une commande").
- **Copy sources**: (a) the `ui-starter/` tree, (b) the yzi-suite-root `.claude/` (walk it via `.claude/.ks-manifest`).
- **Fresh git**: `git init` in the target dir after copy (the source `.git` is excluded).
- **Palette placeholder** already lives in `app/globals.css` `@theme` (AC3) — carries over untouched.

## Verified APIs / functions

- Node stdlib only — no new dep needed. `node:fs` (`readdirSync/statSync/readFileSync/writeFileSync/mkdirSync/cpSync`), `node:path`, `node:child_process` (`execSync('git init')`). Precedent: `scripts/check-design-tokens.mjs` already uses `readdirSync/statSync/readFileSync` + `join/relative` from `node:fs`/`node:path` (top of file). Node 22 (`.nvmrc:22`), so `fs.cpSync(src, dest, { recursive, filter })` is available and its `filter` callback is the natural home for `shouldInclude(path)`.
- `/ks-status` runtime = `.claude/commands/ks-status.md` (a slash-command markdown, Read/Glob/Grep/Bash). No compiled code.

## Traps & constraints

- **Two-source assembly**: `.claude/` is NOT under `ui-starter/`; a naive "copy this repo" misses the whole pipeline. Copy the root `.claude/` (+ root `templates/`/`AGENTS.md` are duplicated inside `ui-starter/` already — use the `ui-starter/` copies to stay single-source, or reconcile).
- **Exclude (never copy)**: `.git/` (fresh history — AC/Trap), `node_modules/`, `.next/`, `dist/`, `*.tsbuildinfo` (e.g. `tsconfig.tsbuildinfo`), `.DS_Store`, **`.env.local`** (213 bytes of real secrets — `.gitignore:2`, `.dockerignore` `.env*`), `.turbo`, `coverage`, `*.log`. Source of truth for the exclude set: `.gitignore` + `.dockerignore`.
- **Include dotfiles**: `.gitignore`, `.dockerignore`, `.prettierignore`, `.prettierrc.json`, `.nvmrc`, `.husky/`, **`.env.local.example`** (keep) — a `*` glob copy skips these; the filter must be allowlist-of-dotfiles-aware, not "skip all dotfiles".
- **docs/ decision**: a fresh project should ship the **framing templates + empty pipeline dirs**, not this starter's story history. Recommend: copy `docs/decisions/` (structural ADRs still apply to any fork) + keep `templates/`; **drop** `docs/research|plans|reviews/s0*.md`, and reset/regenerate `docs/{prd,stories,architecture,design-system}.md` (they are Applyzi/ui-starter-specific — also a source of the `applyzi` grep hits). `/ks-status` degrades gracefully: ks-status.md:25 says "If docs/ doesn't exist … point to /ks-prd", so an empty `docs/` is a valid, honest generated state.
- **AC4 residue (fact 4)**: the copy carries `pine`/`lime` token names, the "CvPreview/CV artifact" comments in `globals.css`, the 8 `Applyzi` comment/script strings, the dead `cv-builder` eslint rule, and `scripts/backup-prod.sh` (Applyzi-prod-specific — probably should be dropped entirely). Guard tests exist and are relevant precedent: `messages/{auth,legal}.test.ts` assert `FORBIDDEN=/applyzi|.../i` over UI strings, and `components/brand/logo.test.ts` asserts no `applyzi` in logo source. None of these cover comments/scripts/token-names, so they'd stay green while the residue ships. This is the story's real judgment call: decide whether AC4 = "no rendered Applyzi" (already true, guarded) or "no Applyzi string anywhere" (not true — requires cleanup in s09 or a documented carve-out).
- **`check-design-tokens` must pass in the generated project** (`prebuild`) — it will, since it runs byte-identical and the tree already passes; but if s09 renames `pine`/`lime` tokens for AC4, every `bg-pine`/`text-lime` utility across `app|components|lib` must be renamed in lockstep or the build/lint breaks. That coupling is why token-rename is risky to bundle here.
- **Name validation**: `<name>` becomes a folder name AND a `package.json` `name` (`package.json:2` is `"ui-starter"` — must be rewritten). npm name rules: lowercase, no spaces, url-safe. Validate + slugify before use.
- **Idempotence**: refuse if the target dir already exists (don't clobber). Cheap guard, worth it.

## Verified APIs / functions (testability)

- Factor the pure logic out of the fs side-effects so it's unit-testable without scaffolding:
  - `shouldInclude(relPath): boolean` — the exclude/allowlist filter (test the include/exclude table directly).
  - `slugifyProjectName(raw): string` + `isValidProjectName(raw): boolean` — name → folder/package name.
  - optionally `rewritePackageName(json, name)`.
- Test THOSE (colocated `scripts/init.test.ts`, Vitest — matches project convention `*.test.ts`). The end-to-end "scaffold + `npm install` + `npm run build` + `/ks-status`" is a **human / "Not verified"** step, consistent with how s01/s06 handled runtime (`docs/reviews/s01-base-fork.md` "Not verified"). Honest altitude: assert the filter/validator + assert the concrete include/exclude list; do not attempt a real full build in CI-less TDD.

## Open questions

1. **AC4 interpretation** — is "no Applyzi artifact" satisfied by "nothing rendered" (true today, guarded) or does s09 own the comment/token/script cleanup (`pine`/`lime` rename, drop `backup-prod.sh`, scrub comments)? This swings the story from "copy script" (3) toward "copy + neutralize pass" (4). **Recommend**: s09 scrubs the _cheap_ residue (comments, `favicon.svg` comment, drop `backup-prod.sh`, fix the dead `cv-builder` eslint rule, strip the CvPreview comment) but does NOT rename `pine`/`lime` tokens (that's an s02-style token change with app-wide blast radius; capture as a design-system note if required). Confirm with the human.
2. **Which `docs/` ships in a fork** — keep `decisions/` + templates, drop story history + reset framing docs? (Recommended above.)
3. **Invocation surface** — plain `node scripts/init.mjs <name>` vs a published `bin`/npx vs a `.claude` command. Recommend the Node script now; a `bin` alias is a one-line add if the "plugin" framing needs `npx`.
4. **Where the generated project lands** — sibling dir `../<name>` by default? Confirm target-path convention.

## Real complexity

**Verdict: 3 (confirmed)** — _if_ AC4 is read as "no rendered Applyzi + fresh git + builds" and s09 does only the cheap comment/script scrub. The mechanics (recursive copy with a filter, `git init`, package-name rewrite, name validation, an existence guard) are a single well-scoped Node script with a pure, testable core; no framework, no new deps, no runtime env. The one thing that could push it to **4** is deciding s09 must rename the `pine`/`lime` tokens for AC4 — that's an app-wide, lockstep utility rename gated by `check-design-tokens`, i.e. a second concern. Keep that OUT of s09 (defer to a token-rename note) and the story stays a clean 3. No split needed.

## Split proposal

Not required (verdict 3). If AC4 is escalated to "zero Applyzi string incl. token names", split off a **s09b-neutralize-token-names** (rename `pine`/`lime` → neutral, update every utility, keep `check-design-tokens` green) so the init script itself stays a testable 3.
