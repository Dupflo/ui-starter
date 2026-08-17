---
validated: yes
---

# Plan — Story s06-stripe-billing

Branch: `feature/s06-stripe-billing`
Research: `docs/research/s06-stripe-billing.md` — read it first; this plan does not repeat it.
Decision: `docs/decisions/005-webhook-idempotence.md` — the idempotence mechanism this plan implements.

## Target story

Souscription Stripe de bout en bout : pricing → Checkout hébergé → webhook → statut d'abonnement local → gate. Abonnements **seulement** (pas de one-time payment). Graveyard : guest checkout, multi-plans complexes. Dépend de s04 (mergé — auth + utilisateur).

Acceptance criteria (`docs/stories.md:127-131`) :

- **AC1** — La page pricing propose 1–2 plans ; le clic ouvre Stripe Checkout.
- **AC2** — Un paiement réussi crée/à-jour un enregistrement d'abonnement lié à l'utilisateur.
- **AC3** — Le webhook met à jour le statut (`active`/`canceled`), avec **vérification de signature** ET **idempotence** (rejouer l'event ne duplique rien).
- **AC4** — Un élément gated n'est visible que pour un abonné `active`.

## Tasks (ordered)

1. [x] **Migration `supabase/migrations/0003_subscriptions.sql` — deux tables, service-role only (ADR 003 + 005).**
   - **`subscriptions`** — colonnes épinglées sur ADR 003 (`user_id`, `stripe_customer_id`, `status`, `plan`) :
     ```
     create table if not exists public.subscriptions (
       user_id                uuid primary key references auth.users (id) on delete cascade,
       stripe_customer_id     text,
       stripe_subscription_id text,
       status                 text not null default 'canceled',
       plan                   text,
       created_at             timestamptz not null default now(),
       updated_at             timestamptz not null default now()
     );
     ```
     `user_id` **PK** (un abonnement par user, baseline — graveyard multi-plans) : c'est aussi la clé de conflit de l'upsert (tâche 5, ADR 005 (B)). `status` en **`text` brut** (pas d'enum Postgres) — on stocke le statut Stripe tel quel (`active`/`canceled`/`trialing`/`past_due`…), le gate mappe (tâche 6) ; même choix que `role` (`0002_role.sql:4-8`). Défaut `'canceled'` (fail-safe : jamais actif par défaut).
   - **`stripe_events`** — dédup au niveau event (ADR 005 (A)) :
     ```
     create table if not exists public.stripe_events (
       id            text primary key,
       received_at   timestamptz not null default now()
     );
     ```
     PK = `event.id` Stripe (globalement unique). Le handler `insert` en tête ; violation d'unicité → rejeu → early-return `200` (tâche 5).
   - **RLS — durcissement obligatoire (miroir s05 `0002_role.sql:10-34`).** Activer RLS sur **les deux** tables. `subscriptions` : **une seule** policy, `select` own (`auth.uid() = user_id`). **Aucune** policy insert/update/delete pour le rôle `authenticated` → un user ne peut PAS forger `status='active'` (défait AC4 = CRITICAL). `stripe_events` : RLS activée, **aucune** policy → totalement inaccessible aux users. Les deux tables ne sont écrites que par le **service-role** (`createServiceRoleClient`), qui bypasse RLS.
     ```
     alter table public.subscriptions enable row level security;
     create policy "subscriptions_select_own"
       on public.subscriptions for select using (auth.uid() = user_id);
     alter table public.stripe_events enable row level security;
     -- pas de policy : service-role uniquement.
     ```
   - En-tête du fichier : commentaire « Applied manually on production — not executed in this environment » (comme `0002_role.sql:2`).

2. [x] **Hand-edit `database.types.ts` — `subscriptions` + `stripe_events`, miroir exact de la migration.**
   - Ajouter dans `public.Tables` (après `profiles`, `database.types.ts:48`) :
     - **`subscriptions`** : `Row` = `{ user_id: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; status: string; plan: string | null; created_at: string; updated_at: string }`. `Insert` = mêmes champs, `user_id` requis, le reste optionnel (defaults en base : `status?`, `created_at?`, `updated_at?`). `Update` = tout optionnel. `Relationships` : FK `subscriptions_user_id_fkey` → `users(id)`, `isOneToOne: true`.
     - **`stripe_events`** : `Row` = `{ id: string; received_at: string }` ; `Insert` = `{ id: string; received_at?: string }` ; `Update` = tout optionnel ; `Relationships: []`.
   - **Édition MANUELLE obligatoire** : aucun script `supabase gen types` dans ce repo (`package.json` : `dev/build/test/typecheck/lint` seulement — cf. s05 plan §task 2). Les types DOIVENT rester le miroir exact de la tâche 1, sinon les clients typés mentent. `status: string` (pas d'union) reflète le `text` brut.

3. [x] **`lib/stripe/config.ts` — source unique des plans (price IDs depuis env).**
   - `import "server-only"`. Exporter un tableau typé `PLANS` (1 ou 2 plans, graveyard : pas de multi-plans complexe), chaque entrée = `{ id: string; priceId: string; nameKey: string; priceLabelKey: string; featuresKey?: string }` où `priceId` est **lu d'une variable d'env** (`STRIPE_PRICE_*`) et les `*Key` sont des **clés i18n** (namespace `pricing`, tâche 7) — jamais de libellé en dur.
   - **Single source of truth** : la page pricing (tâche 4) ET l'action checkout (tâche 5) lisent `PLANS` ; s07 (landing) réutilisera la même source (`docs/stories.md:162`). Exposer un helper `getPlanByPriceId(priceId)` (le webhook peut mapper `priceId → plan` si utile) et/ou `getPlanById(id)`.
   - **Publishable key : PAS requise.** Le flow est du Checkout **hébergé** (l'action renvoie une URL de redirection, `architecture.md` § Stripe) — pas de `stripe.js` client, donc pas de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (research §Open questions Q6). Ne pas l'introduire.

4. [x] **Pricing UI — `app/[locale]/pricing/page.tsx` (rebuild) + composant client CTA. AC1.**
   - Le server component lit `PLANS` (tâche 3) et rend 1–2 cartes d'offre en composant les **primitives `components/ui/*`** (Container/Title/Text/Button déjà importés dans le placeholder ; réutiliser le header logo existant). **Tokens-only** — aucune couleur/radius brute (le `check-design-tokens.mjs` du prebuild casse sinon). Textes via `getTranslations("pricing")` — **fr+en**, aucune string en dur.
   - Chaque CTA « Subscribe » est un **petit composant client** (`"use client"`, p.ex. `app/[locale]/pricing/subscribe-button.tsx` ou `components/app/subscribe-button.tsx`) qui appelle l'action `createCheckoutSession(priceId)` (tâche 5) puis `window.location.href = result.url` sur succès. Navigation interne via `@/i18n/navigation` ; la redirection Stripe est une URL externe (assignation `location.href`, pas `Link`).
   - `/pricing` reste **public** (pas dans `PROTECTED`, `proxy.ts:10`) — ne pas toucher `proxy.ts`. Si l'utilisateur n'est pas connecté au clic, l'action renvoie `{ ok:false, error:"unauthenticated" }` (tâche 5) ; le bouton affiche alors un message / redirige vers `/login` (clé i18n).

5. [x] **Checkout action `lib/actions/checkout.ts` (`"use server"`) + webhook handler. AC1/AC2/AC3.**
   - **`createCheckoutSession(priceId: string)`** :
     - `import "server-only"` implicite via `"use server"` ; identité par `getUser()` (`lib/supabase/server.ts`) — **jamais** un `userId` en argument (AGENTS.md law). `!user` → `{ ok:false, error:"unauthenticated" }`.
     - Valider que `priceId` appartient à `PLANS` (tâche 3) — refuser un priceId arbitraire venu du client.
     - `getStripe().checkout.sessions.create({ mode:"subscription", line_items:[{ price: priceId, quantity:1 }], success_url, cancel_url, client_reference_id: user.id, metadata:{ user_id: user.id } })`. `success_url`/`cancel_url` construits depuis une base env (`NEXT_PUBLIC_SITE_URL` si présent) ou chemins relatifs `/dashboard` / `/pricing`.
     - Retour **result-object** : `{ ok:true, url: session.url }` | `{ ok:false, error }` — **pas d'exception** (`try/catch` → `reportError(err, { route:"checkout", service:"stripe", userId:user.id })`, convention `lib/actions/settings.ts:15` + `lib/observability.ts`).
   - **Webhook — remplir le stub `app/api/webhooks/stripe/route.ts` (garder la vérif de signature existante :14-26).** Après `constructEvent` (ne rien changer avant la ligne :28 `void event`) :
     1. **Idempotence (ADR 005 (A))** — service-role `insert({ id: event.id })` dans `stripe_events`. Si erreur code `23505` (unique violation) → **rejeu** → `return NextResponse.json({ received:true })` (200) **sans** rien appliquer. Autre erreur DB → log + 200 (ou 500 pour laisser Stripe retenter — choisir 500 pour ne pas perdre l'event ; documenter).
     2. **Switch sur `event.type`** :
        - `checkout.session.completed` → `session = event.data.object` ; `userId = session.metadata?.user_id ?? session.client_reference_id` ; capturer `stripe_customer_id`, `stripe_subscription_id` ; **upsert** `subscriptions` (voir 3.) avec `status:"active"` + `plan` (mappé via `getPlanByPriceId` si dispo).
        - `customer.subscription.updated` → mapper `subscription.status` Stripe → écrire tel quel (`active`/`past_due`/…) ; retrouver la ligne par `stripe_customer_id` ou `stripe_subscription_id`.
        - `customer.subscription.deleted` → `status:"canceled"`.
        - défaut → ignorer (200).
     3. **Écriture (ADR 005 (B))** — via `createServiceRoleClient()`, `upsert(row, { onConflict:"user_id" })` (miroir `ensureProfile`) → convergent, rejeu = no-op.
     4. Retour `200 { received:true }` sur succès ; `400` sur signature invalide (déjà en place). Identité **toujours** dérivée de `session.metadata.user_id` / `client_reference_id` côté serveur — jamais d'un input client hors-Stripe.

6. [x] **Reader + gate — `lib/data/subscription.ts` + un élément gated. AC4.**
   - `import "server-only"`. `getSubscription(userId: string): Promise<{ status: string; plan: string | null } | null>` : `createClient()` → `.from("subscriptions").select("status, plan").eq("user_id", userId).maybeSingle()`. Miroir exact de `getRole` (`lib/data/identity.ts:55-63`).
   - Prédicat pur testable : `isActiveSubscriber(status: string | null | undefined): boolean` → `status === "active"` (seul `active` passe ; `trialing`/`past_due`/`canceled` = non). Miroir de `isAdmin` (`identity.ts:71-73`) — extrait pour un test sans DOM runner.
   - **Gate** : sur `app/[locale]/(app)/dashboard/page.tsx` (session déjà résolue, `user.id` en main, `dashboard/page.tsx:17-21`), lire `const sub = await getSubscription(user.id)` et **n'afficher une section** (p.ex. « premium ») **que si** `isActiveSubscriber(sub?.status)`. Défaut fail-safe : pas de ligne / pas `active` → section cachée. Textes via i18n. Le dashboard est déjà sous `(app)` (auth + `ensureProfile`), donc `user` garanti.

7. [x] **Config / env / i18n.**
   - **`.env.local.example`** : sous le bloc `# --- Stripe (abonnements) ---` (`.env.local.example:8-12`), ajouter les **price IDs en placeholders** (`STRIPE_PRICE_...=`) — 1 à 2 selon `PLANS`, commentés (« price\_… depuis dashboard.stripe.com »). **PAS** de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Checkout hébergé). **Aucun secret réel** committé — placeholders vides seulement.
   - **i18n** : nouveau namespace **`pricing`** dans `messages/fr.json` ET `messages/en.json` (top-level, après `admin` — `messages/en.json:125`) : titres/sous-titres, libellés de plan + prix (référencés par les `*Key` de `PLANS`), CTA « Subscribe », message « connectez-vous », libellés de la section gated. **fr+en mis à jour ensemble** (le test de parité `messages/messages.test.ts` échoue sinon).

8. [x] **Tests (Vitest, colocalisés, altitude unitaire — mocks style `settings.test.ts`).**
   - **Webhook** (`app/api/webhooks/stripe/route.test.ts`, nouveau) — mocker `@/lib/stripe/client` (`getStripe().webhooks.constructEvent` renvoie un `event` canné) et `@/lib/supabase/service-role` (spy sur `insert` de `stripe_events` + `upsert` de `subscriptions`), pattern `settings.test.ts:8-14`. Cas :
     - **signature invalide** → `constructEvent` throw → **400** (déjà stubbé, confirmer non régressé).
     - `checkout.session.completed` (`metadata.user_id`) → `insert(stripe_events)` OK puis `upsert(subscriptions, {onConflict:"user_id"})` appelé avec `status:"active"` + le `user_id` du metadata.
     - **REJEU (le mordant de l'idempotence, ADR 005)** : appeler le handler **deux fois** sur le **même `event.id`** ; au 2ᵉ appel, `insert(stripe_events)` renvoie une erreur `code:"23505"` → asserter que **`upsert(subscriptions)` n'est PAS appelé** la 2ᵉ fois et que la réponse est 200. C'est la preuve « rejouer ne duplique rien » sans Stripe/DB live.
     - `customer.subscription.deleted` → upsert `status:"canceled"`.
   - **`isActiveSubscriber`** (dans `lib/data/subscription.test.ts`) — prédicat pur : `"active"`→true ; `"canceled"`/`"trialing"`/`"past_due"`/`null`/`undefined`→false.
   - **`getSubscription`** — mock `from→select→eq→maybeSingle` : ligne présente → `{status,plan}` ; absente (`data:null`) → `null`.
   - **`createCheckoutSession`** — mock `getUser` + `getStripe().checkout.sessions.create` : sans session → `{ok:false,error:"unauthenticated"}` ; `priceId` hors `PLANS` → `{ok:false}` ; nominal → `{ok:true, url}` (result-object, jamais de throw).
   - **`PLANS`** (dans `lib/stripe/config.test.ts` ou intégré) — asserter 1–2 plans, chaque `priceId` défini, chaque `*Key` non vide.
   - **i18n parité** — couverte par `messages/messages.test.ts` existant (namespace `pricing` inclus automatiquement) ; ne pas dupliquer.
   - **Not verified (à porter au review)** : l'application réelle de `0003_subscriptions.sql`, le rejeu réel via `stripe listen`, le vrai Checkout hébergé et le rejet RLS effectif d'une écriture user sur `subscriptions` — pas de Stripe/DB live dans cet env (les fichiers shippent, appliqués à la main). Le review doit _eyeball_ la cohérence migration ↔ `database.types.ts`.

## Run interdicts

- **`subscriptions` et `stripe_events` NON user-writable** : le durcissement RLS (tâche 1) est obligatoire. Une policy insert/update sur `subscriptions` pour `authenticated`, ou l'absence de RLS, = **CRITICAL** (un user forge `status='active'` et défait AC4). Seul le **service-role** écrit ces tables. (Reviewer-vérifiable : grep aucune policy write sur `subscriptions`/`stripe_events`.)
- **Le webhook DOIT vérifier la signature** (garder `constructEvent` existant, `route.ts:23` — ne rien insérer entre `req.text()` et `constructEvent`, garder le **raw body**, jamais `req.json()`) **ET être idempotent** par `event.id` (ADR 005 (A)) + upsert convergent (B).
- **Identité dérivée de `getUser()` (action) / `session.metadata.user_id` (webhook)** côté serveur — **jamais** un `userId`/`priceId` de confiance venu du client sans validation contre `PLANS`.
- **Actions = result-objects** (`{ ok } | { ok:false, error }`), pas d'exception jetée ; modules sensibles `import "server-only"`.
- **`database.types.ts` doit correspondre exactement à la migration** (`subscriptions` + `stripe_events`). Divergence = FAIL.
- **Aucune nouvelle dépendance npm** au-delà de `stripe` (déjà présent, `package.json`). Ne pas modifier `package.json`.
- **Pas de one-time payment, pas de guest checkout, pas de multi-plans complexe** (graveyard). Pas de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `stripe.js` client (Checkout hébergé).
- **Tokens-only + i18n fr+en** sur toute UI ajoutée. **Ne PAS toucher** `scripts/check-design-tokens.mjs` ni `proxy.ts` (`/pricing` public, `/api/webhooks/stripe` hors matcher — inchangés).
- **Aucun secret réel committé** : `.env.local.example` ne reçoit que des placeholders vides.
- **Pas de DB/Stripe live supposé** : migration + handler shippent comme fichiers, appliqués/testés à la main (`stripe listen`) → « Not verified » au review.

## The point everything turns on

Le plan tient sur **le mécanisme d'idempotence d'ADR 005 : dédup traiter-une-fois par `event.id` (table `stripe_events`) + upsert convergent par `user_id`**. Trois endroits où il peut être faux, et à quoi les comparer :

1. **La dédup `insert(stripe_events, {id:event.id})` → early-return sur `23505`.** Vérifier que le handler distingue bien la **violation d'unicité** (= rejeu, on acquitte 200 sans réécrire) d'une **vraie erreur DB** (qu'on ne doit pas avaler en 200 silencieux — sinon on perd l'event). À comparer au comportement Postgres (`code === "23505"`). Si la branche est mal câblée, soit un rejeu réécrit (doublon d'effet de bord), soit une panne DB masque un event.
2. **L'upsert `onConflict:"user_id"`.** C'est ce qui rend la ligne convergente (rejeu = no-op sur l'état, ADR 005 (B)). Comparer à `user_id` **PK** en tâche 1 : la clé de conflit doit exister comme contrainte unique, sinon l'upsert insère en double. Miroir `ensureProfile` (`upsert onConflict:"id"`).
3. **RLS `subscriptions` — la policy `select`-own et l'absence de policy write.** Comparer au durcissement s05 (`0002_role.sql`) : si une policy insert/update traîne, ou si RLS n'est pas activée, un user forge `status='active'`. Le review doit raisonner sur la sémantique RLS (le service-role bypasse, l'`authenticated` n'a aucune porte d'écriture), pas juste lire le SQL. `database.types.ts` doit refléter la migration à l'œil (pas de gen).

## Files touched

- `supabase/migrations/0003_subscriptions.sql` (nouveau) — `subscriptions` + `stripe_events` + RLS durcie.
- `database.types.ts` (édité) — types `subscriptions` + `stripe_events` (Row/Insert/Update).
- `lib/stripe/config.ts` (nouveau) — source unique `PLANS` (price IDs env, libellés i18n).
- `lib/actions/checkout.ts` (nouveau) — `createCheckoutSession` (result-object).
- `app/api/webhooks/stripe/route.ts` (édité) — remplir le stub : idempotence + switch + upsert service-role.
- `lib/data/subscription.ts` (nouveau) — `getSubscription` + `isActiveSubscriber`.
- `app/[locale]/pricing/page.tsx` (rebuild) — cartes d'offre depuis `PLANS`.
- `app/[locale]/pricing/subscribe-button.tsx` (ou `components/app/subscribe-button.tsx`) (nouveau) — CTA client → action → redirect Stripe.
- `app/[locale]/(app)/dashboard/page.tsx` (édité) — section gated derrière `isActiveSubscriber`.
- `.env.local.example` (édité) — `STRIPE_PRICE_*` placeholders.
- `messages/fr.json`, `messages/en.json` (édités) — namespace `pricing`.
- `app/api/webhooks/stripe/route.test.ts`, `lib/data/subscription.test.ts`, `lib/actions/checkout.test.ts` (+ éventuel `lib/stripe/config.test.ts`) (nouveaux) — tests.

Commit : **un seul commit de story** (research + plan + ADR 005 + code). Seconde exception admise (AGENTS.md) : la migration `0003_subscriptions.sql` + son changement `database.types.ts` peuvent atterrir en commit séparément-revertable (même découpe que s05 `0002_role.sql`), si la branche grossit.

## Test strategy

Altitude unitaire, style repo (Vitest colocalisé, mocks du client Stripe et du service-role comme `settings.test.ts`).

- **Webhook** : signature invalide → 400 ; `checkout.session.completed` → `insert(stripe_events)` puis `upsert(subscriptions, active)` ; **rejeu même `event.id` → 2ᵉ `insert` en `23505` → `upsert` NON rappelé, 200** (le mordant d'AC3) ; `customer.subscription.deleted` → `canceled`.
- **`isActiveSubscriber`** (prédicat pur) : `active`→true, tout le reste→false.
- **`getSubscription`** : mock `from→select→eq→maybeSingle` ; présent→objet, absent→null.
- **`createCheckoutSession`** : sans session→`unauthenticated` ; priceId hors `PLANS`→`{ok:false}` ; nominal→`{ok:true,url}` (result-object, jamais throw).
- **`PLANS`** : 1–2 plans, priceIds définis, `*Key` non vides.
- **i18n parité** : `messages/messages.test.ts` existant couvre `pricing` (fr/en).
- **Not verified (review)** : application réelle de la migration, rejeu `stripe listen`, Checkout hébergé réel, rejet RLS effectif d'une écriture user — pas de Stripe/DB live ici.

## Definition of Done

- Migration `0003_subscriptions.sql` : `subscriptions` (PK `user_id`, `status` défaut `canceled`) + `stripe_events` (PK `event.id`), RLS durcie (select-own sur `subscriptions`, aucune écriture user, aucune policy sur `stripe_events`) — AC2, forgerie fermée.
- `database.types.ts` aligné à la main sur la migration (les deux tables).
- Pricing propose 1–2 plans depuis `PLANS` ; clic → `createCheckoutSession` → URL Checkout hébergée (AC1).
- Webhook : signature vérifiée + idempotent (`event.id` + upsert convergent `user_id`), statut `active`/`canceled` écrit via service-role, identité depuis `metadata.user_id` (AC3, AC2).
- Section dashboard visible seulement pour `isActiveSubscriber` (`status==='active'`), lu côté serveur (AC4).
- Tests verts (webhook incl. rejeu, `isActiveSubscriber`, `getSubscription`, `createCheckoutSession`, `PLANS`, parité i18n) ; `typecheck` + `lint` + `check-design-tokens` OK ; pas de régression.
- Un seul commit de story (research + plan + ADR 005 + code) ; diff lisible ; migration en commit séparément-revertable si besoin.
- Review passée sans critique ouverte ; application effective (migration, `stripe listen`) hors de cet env, tracée « Not verified ».
