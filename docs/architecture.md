# Architecture — ui-starter

> Le stack et les conventions **viennent du boilerplate** (`applyzi-flagship/`), pas de choix from scratch. ui-starter est un fork strippé de son domaine (CV/Typst). Voir ADR 001–004.

## Stack
- **Next.js 16** (App Router, RSC) · **React 19** · **TypeScript strict**
- **Tailwind v4** CSS-first (`@theme`, **pas de `tailwind.config`**) + `@tailwindcss/postcss`
- **Supabase** via `@supabase/ssr` (auth + Postgres + storage)
- **Stripe** (`stripe@22`) — abonnements
- **next-intl v4** (i18n, locale-segmentée)
- **react-hook-form + zod** (`@hookform/resolvers`)
- **Vitest** (tests colocalisés) · ESLint flat (`eslint-config-next` 16) · Prettier · Husky + lint-staged
- Node ≥ 18.18 (projet en Node 22, `.nvmrc`) · **dev sur port 8000** (`next dev --port 8000`)

## Repo structure
| Path | Rôle |
|---|---|
| `app/[locale]/` | App Router **segmenté par locale**. `layout.tsx` = provider i18n + `generateMetadata` + `generateStaticParams`. `page.tsx` = landing. |
| `app/[locale]/(app)/` | Route group **authentifié** (dashboard, settings…). `layout.tsx` = `AppShell` (nav/sidebar). |
| `app/[locale]/(legal)/` | Route group pages légales (layout propre). |
| `app/api/` | Route handlers **non préfixés par la locale** (exclus par le matcher du proxy) : `webhooks/stripe`, `auth/callback`, `log`, `cron/ping`. |
| `components/ui/` | **Primitives réutilisables** (Button, Title, Text, Badge, Select, Card, Modal, Container…). Obligatoires — pas de `<button className>` ad hoc. |
| `components/{landing,app,legal,brand,auth}/` | Composants par feature. Écran complexe = **dossier + barrel `index.ts`**. |
| `core/` | **Domaine framework-agnostique** : ports (interfaces) + logique pure, **zéro import next/supabase**. |
| `adapters/` | **Implémentations des ports** de `core/` (ex. via Supabase). |
| `lib/` | Plomberie app, sous-dossiers par concern : `supabase/`, `stripe/`, `actions/` (server actions), `data/` (lectures), `auth/`, `hooks/`, + `cn.ts`, `observability.ts`. |
| `i18n/` | `routing.ts` (locales), `request.ts` (chargement messages), `navigation.ts` (Link/useRouter locale-aware). |
| `messages/` | `fr.json`, `en.json` — toutes les strings UI (starter : fr/en). |
| `supabase/migrations/` | Migrations SQL horodatées, additives. |
| `scripts/` | `check-design-tokens.mjs` (garde-fou tokens), `backup-prod.sh`. |
| Config | `next.config.ts` (`withNextIntl`), **`proxy.ts` (= middleware, renommé en Next 16)**, `instrumentation.ts`, `tsconfig.json` (`@/* → ./*`), `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`. |

## Patterns & conventions
1. **Alias d'import** : toujours `@/` (configuré dans tsconfig ET vitest).
2. **Nommage** : fichiers kebab-case, exports PascalCase (`cta-final.tsx` → `export function CtaFinal`).
3. **Un composant = un fichier** ; écran complexe = dossier + `index.ts` (barrel), constantes en `constants.ts`, schéma zod colocalisé en `*-schema.ts`.
4. **Server/Client** : client → `"use client"`. Server actions → `"use server"` dans `lib/actions/`. Modules server-only → `import "server-only"` (client service-role + client Stripe inclus).
5. **Accès données layered** : lectures dans `lib/data/*`, mutations via server actions dans `lib/actions/*`. Une action **dérive toujours l'identité de `getUser()`** — jamais un `userId` en argument.
6. **Trois clients Supabase** (tous typés `<Database>` depuis `@/database.types`) : `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC/actions/handlers, expose `getUser()`), `lib/supabase/service-role.ts` (bypass RLS, server-only, webhooks).
7. **Forms** : react-hook-form + `zodResolver`, schéma en `*-schema.ts`, type via `z.infer`, messages = clés i18n, `mode: "onBlur"`, listes via `useFieldArray`.
8. **Ports & adapters** : infra transverse = **port interface dans `core/domain/`** (sans import framework), implémenté dans `adapters/`. Logique sensible (débit atomique, idempotence) = **RPC Supabase `SECURITY DEFINER`** ; l'adapter ne fait que mapper snake_case↔camelCase (ADR 004).
9. **Erreurs** : les actions renvoient un **result object** `{ ok: true } | { ok: false, error }`, pas d'exception jetée. Erreurs non catchées → `instrumentation.ts::onRequestError` → `lib/observability.ts::reportError`.
10. **UI** : composer les primitives `components/ui/*` ; merge de classes toujours via `cn()` (`lib/cn.ts` = clsx + tailwind-merge).
11. **Navigation i18n** : toujours via `@/i18n/navigation` (jamais `next/link`). Métadonnées via `generateMetadata` (jamais `export const metadata`). **Aucune string UI en dur** — les deux locales mises à jour ensemble.

## Data model
Baseline **propre et minimale** (ADR 003) — on ne copie pas les ~35 migrations d'Applyzi (entrelacées de schéma CV). Tables du starter :
- **`profiles`** — identité utilisateur (lié à `auth.users`), champ **`role`** (`user`/`admin`, défaut `user`) pour s05.
- **`subscriptions`** — `user_id`, `stripe_customer_id`, `status` (`active`/`canceled`…), `plan` — alimentée par le webhook Stripe (s06).

RLS activée sur les deux. **Écartés du baseline** (réf. seulement, ADR 003) : tout `profiles_*` / `cv_*` / `applications` / `cover_letters*` (domaine CV) et le modèle `credit_ledger`/`credit_transactions`/`user_credits` + RPC reserve/confirm (credit-based, non requis par le PRD abonnement).

## Integration points
- **Auth (Supabase `@supabase/ssr`)** : refresh de session dans `proxy.ts` (rien entre `createServerClient` et `getUser()` — sinon logouts aléatoires). `proxy.ts` garde une liste `PROTECTED` → redirect `/login`, et éjecte les connectés de `/login|/signup`. Callback à `app/api/auth/callback/route.ts` (OAuth `code` via `exchangeCodeForSession`, email `token_hash` via `verifyOtp` ; valide que `next` est un chemin interne — anti open-redirect). Sous `/api/` **volontairement** pour éviter le préfixe locale. **Hors périmètre** : 2FA/OTP (graveyard).
- **Stripe (abonnements)** : `lib/stripe/client.ts` (`getStripe()`, server-only), catalogue d'offres (price IDs depuis env), server action checkout → URL Checkout hébergée, webhook `app/api/webhooks/stripe/route.ts` (vérif signature `constructEvent` sur raw body, **idempotent sur `session.id`**, écrit via client service-role). La `metadata` du Checkout = source de vérité du webhook.
- **i18n (next-intl v4)** : starter sur `["fr","en"]`, `defaultLocale: "fr"`, `localePrefix: "as-needed"` (fr non préfixé).
- **Observabilité** : `instrumentation.ts` → `reportError` (prod). Sélecteur/erreurs non bloquants.

## Design / UX
- **Design system = tokens Tailwind v4 `@theme`** dans `app/globals.css` (source unique). Couleurs (`--color-*`), fonts (`--font-*`), radius/shadow/tracking. Dark mode scopé à `.dark` sur l'app shell (marketing/auth restent clairs) ; `.light-scope` force le clair dans un sous-arbre.
- **Garde-fou `scripts/check-design-tokens.mjs`** (`npm run lint:design` + **auto au `prebuild`**) : interdit les valeurs arbitraires Tailwind sur 5 catégories (couleur, radius, font-size, letter-spacing, box-shadow) ; autorise les dims de layout one-off (`h-[62px]`…). **C'est le mécanisme du re-theme** (ADR 002) : re-thémer = éditer le bloc `@theme`, le guard empêche la dérive.
- Écrans du starter : landing (hero/pricing/CTA), auth (login/signup/logout), app shell protégé + dashboard, `/admin` (gated role), sélecteur de langue. Détail design → `/ks-design-system` puis `docs/designs/<id>.md` par story UI.
