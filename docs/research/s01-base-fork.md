# Research — Story s01-base-fork

> Source du code : **`applyzi-flagship/`** (le fork). Cible : `ui-starter/` (base neutre). Toutes les références `file:line` ci-dessous pointent dans `applyzi-flagship/`.

## The five structuring facts

1. **Ce n'est pas un strip « CV/Typst », c'est un strip multi-domaines.** Le flagship porte CV + agent/LLM + crédits + MCP + OAuth + LinkedIn/apify + cover-letters/portfolio/candidatures. Le baseline à garder = **auth + app-shell + landing scaffold + i18n + primitives UI** seulement (`docs/architecture.md:46-51`, ADR 003). ~90 % du code part.
2. **L'auth baseline est couplée au domaine CV.** Les 5 formulaires d'auth + le settings-form importent `TextField` depuis `@/components/app/cv-builder/fields` (ex. `components/auth/login-form.tsx:10`, `components/app/settings-form.tsx:15`). Il faut **extraire un primitive `TextField`** dans `components/ui/` AVANT de supprimer cv-builder, sinon l'auth (s03) et les settings cassent.
3. **Le billing du flagship est crédits + « sprint », pas abonnement.** Le webhook et le checkout SONT le domaine crédits (`app/api/webhooks/stripe/route.ts:4-7` importe `grantCredits`, `grantSprint`, discord, brevo). ADR 003 **écarte le credit-ledger** et pose un modèle `subscriptions` propre construit en **s06**. Pour s01 : ne garder que la plomberie `getStripe()` (`lib/stripe/client.ts`) ; pas de billing fonctionnel.
4. **Chaque point d'entrée « keep » importe du code strippé et doit être réduit à un stub neutre**, pas juste voir un fichier supprimé : `app/[locale]/page.tsx` (landing 100 % CV), `app/[locale]/(app)/layout.tsx:4-11` (crédits/discord/onboarding), `dashboard/page.tsx:4,9`, `components/app/app-sidebar.tsx:6` (CreditBalance + routes CV), `app/[locale]/pricing/page.tsx:7` (BuyPackButton).
5. **Après le strip, zéro test ne subsiste** : tous les `*.test.ts` sont dans les arbres strippés (mcp, oauth, credits, cv, typst — voir §Traps). `vitest run` sort en échec « no test files » sauf `--passWithNoTests` ou l'ajout d'un test de fumée. Et les hooks `predev`/`prebuild` appellent `scripts/sync-cv-assets.mjs` (à retirer) tout en gardant `scripts/check-design-tokens.mjs` (dépendance de s02).

## Target story

**s01-base-fork** — Base starter propre et neutre (complexité annoncée : 3).
Dériver d'`applyzi-flagship`, débarrassée du domaine métier, pour une fondation neutre qui build et démarre.

Critères d'acceptation :

- [ ] `npm run build` réussit et `npm run dev` démarre sans erreur.
- [ ] Aucune dépendance Applyzi-spécifique dans `package.json` : `@myriaddreamin/typst*`, `apify-client`, `pdf-parse`, `mammoth` absentes.
- [ ] Aucun chemin de code CV/Typst restant (services, components, scripts de rendu CV supprimés).
- [ ] La home affiche un placeholder neutre — zéro branding/contenu Applyzi CV.
- [ ] `npm run test` (Vitest) passe au vert.
- [ ] `.env.local.example` présent avec les clés génériques Supabase + Stripe (pas de secret Applyzi).

## Current state of the code

**Dépendances CV à retirer** (`package.json:31-33,36,41,44`) : `@myriaddreamin/typst-ts-renderer`, `@myriaddreamin/typst-ts-web-compiler`, `@myriaddreamin/typst.ts`, `apify-client`, `mammoth`, `pdf-parse`. À garder : next, react, next-intl, @supabase/\*, stripe, react-hook-form, zod, clsx, tailwind-merge, tailwindcss, vitest, eslint, husky, prettier, lint-staged.

> ⚠️ Le `.env.local.example` référence aussi `ANTHROPIC_API_KEY` (import CV via Claude) — pas une dépendance npm mais un secret domaine à retirer.

**Scripts / hooks** (`package.json:10-11`) : `predev` = `sync-cv-assets.mjs` (retirer) ; `prebuild` = `check-design-tokens.mjs` (garder) `&& sync-cv-assets.mjs` (retirer). `.husky/pre-commit` lance `lint-staged` + `check-design-tokens.mjs` (garder tel quel).

**Arbres à supprimer (STRIP)** : `app/[locale]/(app)/{adapt,candidatures,portfolio,profil,output,mcp}`, `app/[locale]/{bienvenue,oauth}`, `app/api/{agent,cv,import-cv,letter,mcp,oauth}`, `app/.well-known/`, `components/app/*` (sauf app-shell — voir Anchor), `components/app/{cv-builder,cover-letter-builder,socials}/`, `components/landing/*` domaine, `lib/{agent,apify,linkedin,profile-import,credits,mcp,oauth,cv}`, `lib/{brevo,discord,socials,consent?}.ts`, `lib/data/{credits,cvs,cv-seed,dashboard(neutraliser),applications,cover-letters,cover-letter-messages,agent-conversations,onboarding,portfolio,identity(partiel),mcp-*}.ts`, `lib/actions/{articles,avatar,cover-letters,credit-history,cv-*,layout-prefs,linkedin-import,mcp-tokens,onboarding,passions,portfolio,socials,welcome}.ts`, `adapters/rendering/`, `adapters/db/credits/`, `core/`, `services/typst-render/`, `scripts/{sync-cv-assets.mjs,render-cv-samples.mts,assets/}`, `videos/`, `rpi/`, `backups/` (dumps prod `applyzi-prod-*.sql.gz`).

**Home** (`app/[locale]/page.tsx:1-11`) : compose 8 sections landing CV (Hero, TemplatesShowcase, BuiltinAgent, AtsFit, Control, McpSection, PricingTeaser, CtaFinal) → à remplacer par un placeholder neutre (la vraie landing = s07).

**i18n** : `i18n/routing.ts:4` déclare 4 locales `["fr","en","es","pt"]` ; l'architecture cible **fr/en** (`docs/architecture.md:56`). `messages/{fr,en,es,pt}.json` ~50 Ko chacun, ~35 namespaces dont la majorité domaine CV (hero, atsFit, control, builtinAgent, cv, mcp, templates, adapt, portfolio, myCvs, agentPage, output, oauthConsent, mcpInstall, welcome, letter, builder). Namespaces à garder/neutraliser : metadata, nav (élaguer « Agent »/« Créer CV »), auth, appNav (réduire), dashboard, settings, forgot, newPassword, legal, localeSwitcher, footer, cookieBanner.

**Data model** (`database.types.ts`) : 24 tables ; seules `profiles` (avec colonnes CV liées) et `subscriptions` (modèle « sprint »/crédits, pas le modèle propre s06) sont proches du baseline. Tout le reste (credit*ledger, credit_transactions, user_credits, ai_conversations, cv*_, applications, cover_letters_, profiles*\*, mcp*\*) = domaine. 34 migrations sous `supabase/migrations/`, **aucune** ne crée un baseline propre `profiles(role)+subscriptions` conforme à l'architecture.

## Anchor points

Le plan doit brancher / neutraliser précisément ici :

- **Plomberie à GARDER intacte** : `lib/supabase/{client,server,service-role}.ts` (`server.ts:8` `createClient`, `server.ts:35` `getUser`, `server.ts:5` `createServiceRoleClient`), `lib/cn.ts`, `lib/observability.ts` (mais dépend de discord — voir Traps), `lib/hooks/*`, `i18n/{routing,request,navigation}.ts`, `next.config.ts` (intl + ngrok), `instrumentation.ts`, `proxy.ts`, `scripts/check-design-tokens.mjs`, `components/ui/*`, `components/legal/*`, `components/brand/*`, `components/observability/*`, `components/analytics.tsx`, `components/cookie-banner.tsx`.
- **`proxy.ts:9-18`** : liste `PROTECTED` = `["/dashboard","/profil","/candidatures","/adapt","/mcp","/portfolio","/settings","/output"]` → réduire à `["/dashboard","/settings"]` ; **supprimer** la redirection `/cvs → /candidatures` (`proxy.ts` bloc « Ancienne route »).
- **`app/[locale]/(app)/layout.tsx:4-11`** : retirer imports crédits/discord/onboarding + `OnboardingGate` ; garder `getUser`, `ensureProfile`, `getDisplayName/initialsOf/getAvatarUrl` (`lib/data/identity.ts` — vérifier qu'il ne tire pas de CV), `AppShell`.
- **`components/app/app-sidebar.tsx:6`** : retirer `CreditBalance` ; l'ITEMS array pointe vers /profil, /candidatures, /portfolio, /mcp, /adapt → réduire à /dashboard, /settings.
- **`app/[locale]/pricing/page.tsx:7`** : retirer `BuyPackButton` (crédits) — la pricing réelle = s07/s06.
- **Extraire `TextField`** : créer `components/ui/text-field.tsx` (ou input primitive) à partir de `components/app/cv-builder/fields`, puis re-câbler les 5 formulaires d'auth + `settings-form.tsx`.

## Verified APIs / functions

Existent, vérifiés à l'ouverture (à réutiliser sans les réécrire) :

- `lib/supabase/server.ts` : `createClient()` (`:8`), `getUser()` (`:35`), ré-export `createServiceRoleClient` (`:5`) — clients typés `<Database>`.
- `lib/stripe/client.ts` : `getStripe()` (server-only) — la seule plomberie Stripe à garder.
- `scripts/check-design-tokens.mjs` : garde-fou tokens, `ROOTS = ["app","components","lib"]`, règles couleur/radius/font-size/tracking/shadow — **à garder** (anchor de s02).
- `components/auth/google-button.tsx:31` : `supabase.auth.signInWithOAuth({ provider: "google" })` — OAuth **Supabase** natif (à garder), à ne pas confondre avec le serveur OAuth applicatif `lib/oauth/*` (strip).
- `i18n/routing.ts` : `routing`, `Locale`, `LOCALE_LABELS` — réduire à fr/en.
- `next.config.ts` : `withNextIntl` + `allowedDevOrigins` (ngrok) — garder.

## Traps & constraints

1. **Ordre deps ↔ code** : retirer une dep AVANT son code importateur (ou l'inverse partiellement) casse le typecheck/build ; le vert n'est atteint que quand deps ET code partent ensemble. Faire le strip comme une transaction, valider par `npm run typecheck && npm run build`.
2. **`TextField` partagé** (bloqueur) : 5 auth forms (`login/signup/forgot-password/new-password/set-password-form.tsx:~10`) + `settings-form.tsx:15` importent `@/components/app/cv-builder/fields`. Extraire d'abord, sinon suppression = build cassé.
3. **`lib/observability.ts` → discord** : `instrumentation.ts:17` importe `lib/observability`, qui notifie via `lib/discord` (strip). Neutraliser le report (retirer discord) sans casser `onRequestError`.
4. **`lib/actions/settings.ts:5`** appelle `runWriteTool("applyzi_update_identity", …)` du MCP (strip) → remplacer par un upsert Supabase direct sur `profiles`.
5. **Brevo dans des keep-paths** : `app/api/auth/callback/route.ts:4`, `lib/actions/subscribe.ts:4`, `lib/actions/password-reset.ts:4`, `lib/auth/welcome-email.ts:3` importent `lib/brevo`. Décider : stub ou suppression de l'appel (l'auth ne doit pas dépendre de Brevo).
6. **`lib/data/dashboard.ts:3`** importe `activeUnlimitedSub` de `lib/data/credits` (strip) → neutraliser `loadDashboard` (dashboard neutre en s04, ici stub minimal).
7. **Landing couplée** : `builtin-agent.tsx:5` et `control.tsx:5` → `AdaptMotion` ; `cv-preview.tsx:3` → `SkillChip` (cv-builder). Sans objet une fois la home remplacée par un placeholder, mais bien tout supprimer.
8. **Webhook Stripe** (`app/api/webhooks/stripe/route.ts`) = 100 % crédits/sprint + discord + brevo + `findOrCreateUserByEmail`. Le vrai webhook abonnement = s06. Pour s01 : réduire à un stub qui vérifie la signature (ou retirer la route), pas de logique crédits.
9. **Vitest zéro test** : après strip il ne reste aucun `*.test.ts` (tous dans mcp/oauth/credits/cv/typst — voir liste). `vitest run` échoue « No test files found ». Ajouter `passWithNoTests` (config/flag) **ou** un test de fumée baseline (recommandé : un test qui valide un module gardé, ex. `lib/cn.ts`).
10. **Résidus** : `.claude/worktrees/great-tesla-3670ba/` (copie de worktree obsolète) et `backups/*.sql.gz` (dumps prod) ne doivent pas atterrir dans le fork. `.env.local.example` mentionne « MÊME projet PROD que jobhope » — secret/contexte à purger.
11. **`database.types.ts`** : importé par les 3 clients Supabase (typés `<Database>`). Référence des tables qui seront supprimées côté DB ; côté code il compile quand même (fichier de types). Cohérence avec l'architecture (baseline propre) = question ouverte ci-dessous.

## Open questions

- **Périmètre DB de s01** : s01 régénère-t-il un `database.types.ts` + une migration baseline propre (`profiles(role)`, `subscriptions` propre), ou laisse-t-il la DB/les types au domaine de s05 (role) / s06 (subscriptions) et se contente du strip **code** ? Les critères d'acceptation de s01 (build/start/test) n'exigent pas de DB propre ; l'ADR 003 exige un baseline propre à terme. → À trancher au plan.
- **Webhook & pricing en s01** : stub qui vérifie la signature, ou suppression pure jusqu'à s06 ? (idem `app/[locale]/pricing/page.tsx`).
- **Brevo** : conservé comme plomberie e-mail générique du starter, ou retiré ? L'architecture ne le liste pas dans le stack — a priori retiré.
- **`lib/data/identity.ts`** : `getDisplayName/initialsOf/getAvatarUrl` sont utiles au shell ; à vérifier qu'ils ne lisent pas de colonnes CV de `profiles` avant de les garder.

## Real complexity

**Verdict : 4** (annoncé 3). L'écart vient du fait que la story a été chiffrée comme « enlever le CV/Typst » alors que le code réel impose : (a) supprimer **cinq** domaines imbriqués (CV, agent, crédits, MCP, OAuth) + LinkedIn/brevo/discord, (b) **neutraliser ~8 fichiers keep** (home, app-layout, dashboard, sidebar, pricing, settings, webhook, observability) qui importent du code strippé, (c) **extraire `TextField`** pour découpler l'auth, (d) traiter le **piège vitest-zéro-test**, (e) nettoyer hooks/env/locales, (f) une **question DB** non triviale. Ce n'est pas un 5 : le livrable reste **un seul résultat cohérent** (une base neutre qui build/démarre/teste-vert) et l'essentiel est de la **suppression mécanique** validable par `typecheck + build`. Le risque (imports cassés) est réel mais bornable.

## Split proposal (optionnel — recommandé si on veut baisser le risque)

Découpe possible en 2 slices, cut line = « plus aucun import keep→strip » :

- **s01a — Découpler** : extraire `TextField` dans `components/ui/`, remplacer l'appel MCP de `settings.ts` par un upsert Supabase, retirer discord/brevo des keep-paths, neutraliser home/app-layout/dashboard/sidebar/pricing pour qu'ils n'importent plus de code domaine — **sans** encore supprimer les arbres ni les deps. Vérifiable : `typecheck + build` verts, `grep` prouve zéro import keep→strip.
- **s01b — Supprimer & nettoyer** : rm des arbres CV/agent/crédits/MCP/OAuth, retrait des deps (`package.json`), hooks `predev`/`prebuild`, `.env.local.example` générique, locales fr/en, `passWithNoTests`/test de fumée. Ferme les critères d'acceptation (no deps, no CV paths, home neutre, test vert).

Recommandation : **exécuter en une story (4)** si l'implémenteur travaille en TDD sur le build/typecheck comme filet ; **splitter** seulement si on veut isoler le découplage risqué (s01a) de la suppression mécanique (s01b). À trancher à `/ks-plan`.
