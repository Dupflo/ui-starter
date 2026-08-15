# Stories Review — ui-starter

> Fresh-context review of `docs/stories.md` against `docs/prd.md`. Each issue classified: critical / major / minor.

## Perimeter coverage
| PRD feature (core loop) | Covered by | OK? |
|---|---|---|
| Design system re-themable (swap palette via tokens) | s02-design-tokens-retheme | ✅ |
| Auth (signup/login/logout/session Supabase SSR) | s03-auth | ✅ |
| Rôle minimal user/admin (flag booléen) | s05-role-admin | ✅ |
| App shell protégé (layout, nav, user menu, route protection) | s04-app-shell | ✅ |
| Stripe billing (checkout + abonnement + webhook, 1–2 plans) | s06-stripe-billing | ✅ |
| Landing scaffold (hero, pricing branché Stripe, CTA) | s07-landing | ✅ |
| i18n fr/en | s08-i18n | ✅ |
| init/fork + pipeline killer-saas pré-câblé | s09-init-command | ✅ |

- [x] Every feature of the PRD "Replicated (core loop)" table is delivered by at least one story

All 8 core-loop features are covered. s01-base-fork is an additional enabling story that delivers the PRD's "propreté" success criterion (zero Applyzi-specific dependency remaining) and the "dérivé d'Applyzi en strippant le domaine" constraint — it is a shippable slice (a clean neutral base that builds and boots), not merely a technical layer.

## Scope
- [x] No story reintroduces an item from the PRD graveyard ("Explicitly NOT replicated")
- [x] No story goes beyond the perimeter

Graveyard is well-defended: s03 excludes 2FA/OTP, s05 forbids RBAC/CASL and stays on a single `role` column, s06 excludes guest checkout / complex multi-plan, s07 excludes the ship-saas sales landing (go-to-market), s01 strips the Applyzi domain. Multi-tenant, Inngest, full admin dashboard, Clean Architecture 3-couches: none reappear.

## Story quality
- [x] Each story is an end-to-end shippable slice, not a technical layer
- [x] Every acceptance criterion can become a test
- [x] Agentic notes present and useful (files, constraints, traps)
- [x] Complexity scored; no unsplit 5; every 4 states its risk

Notes:
- No story is a disguised technical layer. Tables/migrations are created *inside* the story that needs them (s05 adds `role` inline, s06 creates `subscriptions` inline) — exactly the intended pattern, not standalone "create the table" stories.
- Criteria are overwhelmingly testable: assertions on build/test passing, redirects, session persistence, webhook idempotence, 403 for non-admin, i18n key coverage. Two 4-complexity stories: s06 states its risk explicitly ("Risk (4): sécurité + fiabilité du webhook…"); s01 is a 3 and still spells out its own risk. No 5s to split.

## The list as a whole
- [x] Dependency order executable: no cycle, no forward reference
- [x] Ids well-formed (`s<number>-<slug>`), unique and stable
- [x] No overlap or duplication between stories

Dependency graph resolves cleanly backward: s01 → {s02, s03} → {s04} → {s05, s06} → {s07} → {s08} → {s09}. No cycle, no forward reference. Ids s01–s09 all conform and are unique. The one shared surface — the pricing plan list touched by both s06 and s07 — is explicitly de-duplicated (s07 reads "la même source de plans que s06"), so it is coordination, not overlap.

## Findings

- **minor** — s02-design-tokens-retheme — criterion "Modifier les valeurs de palette met à jour landing + app shell + composants" references landing and app shell, which do not yet exist at s02's position in the order (s04, s07 come later). The intent is a token-plumbing guarantee, but as literally worded the test can only be fully exercised once later screens land. Reword to target the components actually present at s02 (or make it a re-verification step). Not a true forward dependency — s02 does not require those stories to be *done* — hence minor.
- **minor** — s08-i18n — criterion "aucune clé manquante à l'exécution" across all delivered screens is testable but implicitly re-touches strings owned by s03/s04/s06/s07; this is correctly flagged as a "finalisation" story in its notes, so it is a wording/scoping nuance rather than an overlap. Acceptable as-is; noted for awareness.
- **minor** — s01-base-fork — "Target ref: structure de projet de ship-saas.now" is slightly loose given the PRD's origin is Applyzi (fork), not ship-saas; the agentic notes already resolve this correctly (derive from `applyzi-flagship/`), so purely a wording nit.

No critical or major issues found. Coverage is complete, the graveyard holds, dependencies are executable, and complexity is properly scored.

## Verdict
Max severity: minor
Stories ready: yes
