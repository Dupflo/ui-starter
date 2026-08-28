# Review — Story s09-init-command

Anti-hallucination review. Branch `feature/s09-init-command` @ `cb0b11e`, diff vs `main`.
Reviewer ran the full gate and read `scripts/init.mjs` + `scripts/init.test.ts` line by line.

## Gate (run in this environment — Node 26 present; .nvmrc pins 22)

| Check                                             | Result                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (`tsc --noEmit`)              | PASS                                                                                                                        |
| `npm run lint`                                    | PASS — 0 errors, 4 warnings (pre-existing `set-state-in-effect` in `cookie-banner.tsx`/`modal.tsx`, unrelated to this diff) |
| `npm run lint:design` (`check-design-tokens.mjs`) | PASS — no arbitrary values in 86 files                                                                                      |
| `npm run test` (vitest)                           | PASS — 19 files, 168 tests                                                                                                  |
| `npm run build`                                   | PASS — full route table prerendered                                                                                         |

Init test bites: flipping `expect(shouldInclude(".env.local")).toBe(false)` → `true` makes `scripts/init.test.ts` fail (1 failed / 50 passed). Restored. The security-critical assertion is real.

## AC verification

- **AC1** (generated project builds/starts) — NOT VERIFIED in this env (no live scaffold). Human step:
  `npm run init demo-app && cd ../demo-app && npm install && cp .env.local.example .env.local && npm run build && npm start`.
  Code-read: env is read lazily at request time (research fact 5), `prebuild` runs `check-design-tokens` which passes byte-identical on the copied tree. No blocker found by reading.
- **AC2** (pipeline present, `/ks-status` runs inside) — NOT VERIFIED live. Code-read CONFIRMS the assembly: `templates/` + `AGENTS.md` live under `ui-starter/` and arrive via the filtered tree copy; the parent `../.claude/` (verified to contain `commands/ks-status.md`) is copied to `<target>/.claude` (`init.mjs:186-193`). `ui-starter/.claude` does not exist, so the two-source copy is necessary and present.
- **AC3** (placeholder palette) — HOLDS. No `--color-*` VALUE changed; only comments edited. `pine`/`lime` names retained by design (deferred to a future token-rename story per plan). `lint:design` green.
- **AC4** (no Applyzi artifacts) — VERIFIED at the source layer:
  - `git grep -in applyzi -- . ':!docs/'` → only the 3 allowed guard fixtures (`components/brand/logo.test.ts`, `messages/auth.test.ts`, `messages/legal.test.ts`, which assert ABSENCE), the `AGENTS.md:65` fork-origin line, and `scripts/init.test.ts:216-218` (a test string naming the real ADR filename `docs/decisions/001-boilerplate-fork-applyzi.md` to assert its inclusion). No rendered/logic residue.
  - `git grep -inE 'cvpreview|cv-builder|cv artifact|typst' -- . ':!docs/'` → only `AGENTS.md:83` graveyard line (legitimate rules doc).
  - `favicon.svg`: only the `<!-- -->` title comment changed; all `fill=` rects/paths byte-identical.
  - At the generated-tree layer, `shouldInclude` additionally drops `docs/{research,plans,reviews}/` and resets the framing `.md` (the bulk of the `applyzi` hits under `docs/`).

## Scrub scope (task 1) — confirmed comments/config only

`app/globals.css` (header + 2 inline comments, no value change), `components/cookie-banner.tsx` (JSDoc subject line; renders i18n keys, no rendered change), `public/favicon.svg` (title comment), `eslint.config.mjs` (dropped the dead `components/app/cv-builder/preview.tsx` override — path does not exist in the fork — and the `Typst` mention in a rule comment; the rule itself kept), `scripts/backup-prod.sh` dropped entirely. No rendered logic touched, no token rename. `check-design-tokens.mjs`, `proxy.ts`, the Stripe webhook — untouched.

## `shouldInclude` correctness (the load-bearing filter)

Read `init.mjs:79-148`. Deny-list-first, then dotfile allow-list, then default-allow:

- EXCLUDES `.git/`, `node_modules/`, `.next/`, `dist/`, `coverage/`, `.turbo/`, `*.tsbuildinfo`, `.DS_Store`, `*.log`, and the exact file `.env.local` (real 213-byte secret verified present) — NOT `.env.local.example`. The `p === ".env.local"` exact match cannot catch `.env.local.example` (different string), and `.example` is explicitly allowed at `:144`. Security distinction is correct.
- EXCLUDES `docs/{plans,research,reviews}/` and the 5 framing `.md`; KEEPS `docs/decisions/` (default-allow).
- INCLUDES `.gitignore`, `.dockerignore`, `.prettierignore`, `.prettierrc.json`, `.nvmrc`, `.husky/`, `.env.local.example`.
  The 27 `shouldInclude` assertions in `init.test.ts` pin every one of these; one was proven to bite.

## Side-effect-free import (entry guard)

`init.mjs:263` guards `main()` behind `import.meta.url === file://${process.argv[1]}`. Confirmed empirically: the vitest import runs no scaffold — after the test run, `git status` on the test file is clean and no `../demo`/`../my-app` directory was created. `cpSync`/`git init` only run when the module is the entry point.

## Two-source assembly + clean git (code-read)

`scaffold()` (`init.mjs:159-233`): (1) `cpSync(root, target, { recursive, filter })` with `filter` calling `shouldInclude(relative(root, src))` — root itself passes via the `rel === ""` guard; (2) copies parent `../.claude` → `<target>/.claude`; (3) rewrites `package.json` `.name` to the slug with a trailing newline; (4) seeds empty `docs/{research,plans,reviews}/` with `.gitkeep`; (5) `git init` + `git add -A` + one initial commit in `<target>` — source `.git/` is excluded by the filter, so no inherited history. Existence guard at `:164` refuses to clobber. Reasoning holds; not run live.

## Package wiring / deps

`package.json`: only `"init": "node scripts/init.mjs"` added to `scripts`. Dependency blocks unchanged (0 added dep lines). `init.mjs` uses `node:fs`/`node:path`/`node:child_process`/`node:url` only — stdlib, no `bin`, matching the `check-design-tokens.mjs` sibling pattern.

## Plan ↔ diff drift

None. Every plan task (1–17) is reflected in the diff; nothing in the diff is outside the plan. Files touched match the plan's "Files touched" list exactly (`backup-prod.sh` dropped per the plan's permitted alternative).

## Findings

- **Minor** — `init.test.ts:222-223` asserts `shouldInclude("docs/decisions/002-design-tokens.md")` while the real file is `002-design-tokens-theme-guard.md`. The test only exercises the `docs/decisions/` prefix predicate so the assertion is valid, but the invented filename could mislead a reader into thinking it maps to a real ADR. Cosmetic; no behavioral impact.

No critical or major issues. No invented API, no weakened test, no secret leak, no ADR conflict, no token-value change.

Max severity: minor
Ship allowed: yes
