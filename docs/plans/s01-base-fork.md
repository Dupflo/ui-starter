---
validated: yes
---

# Plan — Story s01-base-fork

Branch: `feature/s01-base-fork`
Research: `docs/research/s01-base-fork.md` — read it first; this plan does not repeat it.

## Target story

Base starter propre et neutre : dériver d'`applyzi-flagship`, débarrassée du domaine métier, pour une fondation qui build et démarre. Complexité réelle : **4** (cf. research).

Critères d'acceptation :

- [x] `npm run build` réussit et `npm run dev` démarre sans erreur.
- [x] Aucune dépendance Applyzi-spécifique : `@myriaddreamin/typst*`, `apify-client`, `pdf-parse`, `mammoth` absentes de `package.json`.
- [x] Aucun chemin de code CV/Typst restant.
- [x] La home affiche un placeholder neutre — zéro branding/contenu CV.
- [x] `npm run test` (Vitest) passe au vert.
- [x] `.env.local.example` présent avec les clés génériques Supabase + Stripe.

## Decisions taken at planning (open questions from research)

- **Périmètre DB** : s01 **fait** le baseline propre (mandat ADR 003 « migration initiale propre »). Une migration `supabase/migrations/0001_baseline.sql` crée `profiles` minimal (id → `auth.users`, `created_at`, `display_name`, `avatar_url`, RLS) ; `database.types.ts` est réécrit minimal (table `profiles` seule). **`role` reste à s05, `subscriptions` reste à s06.**
- **Webhook & pricing** : réduits à un **stub** (webhook = vérif signature seule, aucune logique crédits ; pricing = placeholder neutre). Le vrai billing = s06. On ne supprime pas la route pour préserver le contrat pour s06.
- **Brevo** : **retiré** des keep-paths (non listé dans le stack de l'architecture).
- **Vitest** : on garde une **suite réelle** (test de fumée baseline), pas `--passWithNoTests`.
- Ces choix restent dans le cadre d'ADR 003 → **pas de nouvel ADR**.

## Tasks (ordered)

> Ordre = « découpler → supprimer → nettoyer », chaque tâche laisse `npm run typecheck && npm run build` **verts** (donc vérifiable isolément).

1. [x] **Extraire le primitive `TextField`** → `components/ui/text-field.tsx` (depuis `components/app/cv-builder/fields`), re-câbler les 5 formulaires d'auth (`login/signup/forgot-password/new-password/set-password-form.tsx`) + `components/app/settings-form.tsx`. _Vérif_ : `grep -rn "cv-builder/fields" components/auth components/app/settings-form.tsx` → vide ; typecheck vert.
2. [x] **Neutraliser `lib/actions/settings.ts`** : remplacer `runWriteTool("applyzi_update_identity", …)` par un upsert Supabase direct sur `profiles` (identité dérivée de `getUser()`), résultat `{ ok } | { ok:false, error }`. _Vérif_ : plus d'import `lib/mcp` ; test unitaire sur la forme du result-object.
3. [x] **Sévrer tous les imports keep→strip** (sans encore supprimer les arbres) :
   - `app/[locale]/page.tsx` → placeholder neutre (`Container`+`Title`+`Text`, tokens only, clés i18n `home.*`).
   - `app/[locale]/(app)/layout.tsx` → retirer crédits/discord/onboarding/`OnboardingGate` ; garder `getUser`/`ensureProfile`/identity/`AppShell`.
   - `app/[locale]/(app)/dashboard/page.tsx` + `lib/data/dashboard.ts` → dashboard neutre (pas de lecture crédits/subscriptions/onboarding).
   - `components/app/app-sidebar.tsx` → retirer `CreditBalance` ; ITEMS = `/dashboard` + `/settings`.
   - `app/[locale]/pricing/page.tsx` → retirer `BuyPackButton` (placeholder).
   - `lib/observability.ts` → retirer la dépendance `lib/discord`.
   - `app/api/auth/callback/route.ts`, `lib/actions/subscribe.ts`, `lib/actions/password-reset.ts`, `lib/auth/welcome-email.ts` → retirer `lib/brevo`.
   - `app/api/webhooks/stripe/route.ts` → stub vérif-signature (0 crédits/discord/brevo).
     _Vérif_ : `grep` prouve zéro import résiduel vers les modules strippés ; typecheck+build verts.
4. [x] **Supprimer les arbres domaine** : CV (`components/app/cv-builder`, `cover-letter-builder`, `socials`, `core/`, `adapters/rendering`, `lib/cv`, `services/typst-render`), agent (`lib/agent`, `app/api/agent`, `app/[locale]/(app)/adapt`), crédits (`lib/credits`, `lib/data/credits`, `adapters/db/credits`, `credit-balance`, `buy-pack-button`), MCP (`lib/mcp`, `app/api/mcp`, `app/[locale]/(app)/mcp`), OAuth applicatif (`lib/oauth`, `app/api/oauth`, `app/.well-known`, `app/[locale]/oauth`), LinkedIn/apify (`lib/apify`, `lib/linkedin`, `lib/profile-import`), `lib/{brevo,discord,socials}.ts`, routes `(app)/{candidatures,portfolio,profil,output}`, `bienvenue`, `onboarding*`, `scripts/{sync-cv-assets.mjs,render-cv-samples.mts,assets}`, `videos/`, `rpi/`, `backups/`, `.claude/worktrees/`. Retirer les `lib/actions/*` et `lib/data/*` domaine devenus orphelins. _Vérif_ : `find` → arbres absents ; typecheck+build verts.
5. [x] **`package.json`** : retirer `@myriaddreamin/typst*` (×3), `apify-client`, `mammoth`, `pdf-parse` ; `predev` supprimé, `prebuild` = `check-design-tokens` seul. _Vérif_ : deps absentes ; `npm run build` (prebuild) vert.
6. [x] **DB baseline** : `supabase/migrations/0001_baseline.sql` (profiles + RLS), supprimer les 34 migrations CV ; réécrire `database.types.ts` minimal (profiles). _Vérif_ : typecheck vert ; seule la migration baseline reste ; les 3 clients Supabase compilent.
7. [x] **i18n fr/en** : `i18n/routing.ts` + `LOCALE_LABELS` → `["fr","en"]` ; supprimer `messages/{es,pt}.json` ; élaguer `messages/{fr,en}.json` aux namespaces gardés (metadata, auth, appNav, dashboard, settings, forgot, newPassword, legal, localeSwitcher, cookieBanner, home) — `nav`/`footer` finalement supprimés avec les composants landing (aucune référence gardée) ; `proxy.ts` → `LOCALE_PREFIX = /^\/(fr|en)…/`, `PROTECTED = ["/dashboard","/settings"]`, retirer la redirection `/cvs`. _Vérif_ : test de parité de clés fr↔en (namespaces gardés) ; `next build` vert ; aucun `MISSING_MESSAGE` sur les écrans livrés.
8. [x] **`.env.local.example`** générique : Supabase (URL, ANON, SERVICE*ROLE) + Stripe (SECRET, WEBHOOK_SECRET) uniquement ; retirer Typst/MCP/OAuth/Apify/Anthropic/GTM/Clarity/CREDITS + la note « projet PROD jobhope ». \_Vérif* : `grep` → seules les clés génériques présentes.
9. [x] **Filet de test + portes finales** : ajouter un test de fumée baseline (`lib/cn.test.ts`) ; `npm run typecheck && npm run lint && npm run lint:design && npm run build && npm run test` verts ; `npm run dev` démarre et sert la home neutre. _Vérif_ : toutes les commandes vertes.

## Run interdicts

- `scripts/check-design-tokens.mjs` : diff **vide** (propriété de s02 ; garder tel quel).
- `components/ui/*` existants : ne pas re-styler/renommer — **seul ajout autorisé** : `text-field.tsx`.
- Aucune valeur Tailwind arbitraire (couleur/radius/font-size/tracking/shadow) : la home/pricing neutres passent par les tokens (le guard casse sinon).
- Ne pas **construire** de vraie feature : auth réelle = s03, app-shell = s04, role = s05, billing = s06, landing = s07, i18n complète = s08. Ici : strip + stubs neutres uniquement.
- Aucune nouvelle dépendance npm. Pas de commit sur `main` (travailler sur `feature/s01-base-fork`). Ne pas toucher aux docs de framing (prd/stories/architecture/design-system/ADR).

## The point everything turns on

Le plan tient sur l'ordre **découpler avant supprimer** : extraire `TextField` et sévrer les imports keep→strip (tâches 1-3) pendant que le code domaine est encore présent, pour que chaque étape reste build-verte. Trois endroits où il peut se tromper :

- **`lib/data/identity.ts`** — s'il lit des colonnes CV de `profiles`, le `profiles` minimal (tâche 6) casse le shell. Comparer les colonnes lues à celles du `0001_baseline.sql`.
- **`database.types.ts` minimal** — doit satisfaire les génériques `<Database>` de `@supabase/ssr`. Comparer à l'usage réel dans `lib/supabase/{client,server,service-role}.ts`.
- **Élagage des messages** (tâche 7) — une clé supprimée encore référencée par un composant gardé = `MISSING_MESSAGE` au runtime. Comparer les namespaces des `useTranslations`/`getTranslations` des composants gardés aux fichiers élagués.

## Files touched

- Ajout : `components/ui/text-field.tsx`, `supabase/migrations/0001_baseline.sql`, `lib/cn.test.ts`, `docs/research|plans/s01-base-fork.md` (portés par le commit).
- Modif : `app/[locale]/page.tsx`, `app/[locale]/(app)/{layout,dashboard/page}.tsx`, `app/[locale]/pricing/page.tsx`, `components/app/{app-sidebar,settings-form}.tsx`, les 5 `components/auth/*-form.tsx`, `lib/actions/{settings,subscribe,password-reset}.ts`, `lib/auth/welcome-email.ts`, `lib/data/dashboard.ts`, `lib/observability.ts`, `app/api/{auth/callback,webhooks/stripe}/route.ts`, `i18n/routing.ts`, `proxy.ts`, `messages/{fr,en}.json`, `database.types.ts`, `package.json`, `.env.local.example`.
- Suppression : arbres listés tâche 4 + `messages/{es,pt}.json` + migrations CV.

## Test strategy

- **Unit (Vitest)** : `lib/cn.test.ts` (fumée) ; test du result-object de l'action `settings` neutralisée ; test de parité de clés fr↔en pour les namespaces gardés (protège aussi s08).
- **Structurel (grep, vérifiable par le reviewer)** : zéro import keep→strip ; deps CV absentes ; une seule migration.
- **Build-level** : `typecheck`, `lint`, `lint:design` (guard tokens), `build` (prebuild), boot `dev` sur la home neutre.

## Definition of Done

- PR unique sur `feature/s01-base-fork`, diff lisible, un seul commit (research+plan inclus).
- `build`/`dev`/`test`/`typecheck`/`lint`/`lint:design` verts.
- Zéro dépendance, code, route ou secret domaine CV/agent/crédits/MCP/OAuth restant ; home neutre.
- `.env.local.example` générique ; locales fr/en ; baseline DB propre (profiles).
- Review passée (aucun critical) avant `/ks-ship`.
