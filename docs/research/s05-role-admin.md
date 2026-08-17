# Research — Story s05-role-admin

## The five structuring facts

1. **`role` n'existe PAS encore — il est planifié pour s05, pas livré.** `supabase/migrations/0001_baseline.sql:1-10` crée `profiles(id, created_at, display_name, avatar_url)` sans `role`, et le commentaire d'en-tête dit explicitement « `role` (s05) [...] added by their own stories » (`0001_baseline.sql:3`). ADR 003 (`docs/decisions/003-data-billing-baseline.md:12`) le confirme : `profiles` doit porter « `role` `user`/`admin` défaut `user` », mais la migration baseline ne l'a pas inclus. → **AC1 exige une NOUVELLE migration `0002_*.sql`**, pas une simple lecture d'un champ existant.

2. **La lecture serveur du profil est un pattern déjà rôdé, à réutiliser tel quel.** Toutes les lectures passent par `createClient()` (anon, RLS) + `.from("profiles").select(...).eq("id", userId).maybeSingle()` : `lib/data/identity.ts:16-21`, `lib/data/dashboard.ts:14-19`. Il n'existe PAS de helper « charge la ligne profil complète » — chaque helper sélectionne ses colonnes. → s05 ajoute un helper `getRole(userId)` (ou étend `identity.ts`) sur le même modèle, appelé en RSC.

3. **La protection de route est en DEUX temps et le rôle relève du second.** `proxy.ts:9` a une liste `PROTECTED = ["/dashboard","/settings"]` qui ne fait qu'exiger une **session** (`proxy.ts:39-56`, redirige vers `/login`). Le middleware ne peut PAS lire le rôle (pas d'accès DB fiable, règle « rien entre createServerClient et getUser », `proxy.ts:38`). → `/admin` va dans `PROTECTED` pour l'auth, MAIS le **gate rôle est fait côté page/layout serveur** (comme `dashboard/page.tsx:17-21` fait déjà `getUser()` + `redirect`).

4. **Le trap self-promotion est RÉEL et déjà armé par une action existante.** `settings.ts:28-30` fait un `upsert` sur `profiles` via `createClient()` (anon), autorisé par la policy `profiles_update_own` (`0001_baseline.sql:27-31`) qui permet à un user de mettre à jour **sa propre ligne, toutes colonnes**. Si `role` est une colonne ordinaire, un `user` peut se promouvoir `admin` (via cette action ou un appel direct). → la migration DOIT empêcher l'écriture de `role` par le user (policy `WITH CHECK` interdisant le changement de `role`, ou trigger, ou colonne hors RLS user).

5. **Pas de script `supabase gen types` : `database.types.ts` est maintenu à la main.** Aucune occurrence de « gen types » nulle part (`package.json` scripts : `dev/build/test/typecheck/lint`, pas de génération ; grep global vide). `database.types.ts:18-35` définit le `profiles` Row/Insert/Update sans `role`. Tous les clients sont typés `<Database>` (`server.ts:11`, architecture.md:39). → l'implémenteur **édite `database.types.ts` à la main** pour ajouter `role` aux trois shapes (pas de DB live supposée dans cet env — à flaguer).

## Target story

**s05-role-admin** (`docs/stories.md:100-118`, complexité annoncée **1**, dépend de s04 mergé).
Une zone `/admin` réservée aux admins, back-office basique inaccessible aux users normaux.

Acceptance criteria :

- **AC1** : chaque utilisateur a un champ `role` défaut `user` (migration Supabase).
- **AC2** : un `admin` accède à `/admin` ; un `user` reçoit un refus (403 ou redirection).
- **AC3** : le rôle est lu **côté serveur** (pas seulement client) pour la protection.

Notes story : **enum/booléen simple, PAS de RBAC/CASL** (graveyard). Une colonne `role` suffit. NE PAS répliquer le RBAC de ship-saas.now.

## Current state of the code

- **Schéma** : `0001_baseline.sql` — `profiles` avec RLS activée et 3 policies (select/insert/update own, lignes 15-31). `subscriptions` (s06) et `role` (s05) explicitement différés (`0001_baseline.sql:3`).
- **Types** : `database.types.ts:17-45` — `profiles` Row/Insert/Update sans `role`, maintenus manuellement.
- **Auth serveur** : `lib/supabase/server.ts:35-43` expose `getUser()` (dérive l'identité de la session, jamais d'argument userId — conforme à AGENTS.md).
- **Lectures profil** : `lib/data/identity.ts` (`getDisplayName`, `getAvatarUrl`), `lib/data/dashboard.ts` (`loadDashboard`) — toutes en `select` ciblé sur `profiles`, RSC, `import "server-only"`.
- **Provisioning** : `lib/data/ensure-profile.ts:14-31` — upsert service-role idempotent (crée la ligne au 1er chargement du layout `(app)`).
- **App shell** : `app/[locale]/(app)/layout.tsx` — appelle `getUser()`, `ensureProfile`, monte `AppShell`. Nav = `components/app/app-sidebar.tsx:29-32` avec `ITEMS = [{dashboard},{settings}]` (+ `ICONS` ligne 12).
- **Middleware** : `proxy.ts:9` `PROTECTED`, refresh session Supabase, redirections auth.
- **Pas UNE occurrence de `role`-colonne** en code (les hits grep sont `service-role`, attributs a11y `role=`).

## Anchor points

- **AC1 (migration)** : nouveau fichier `supabase/migrations/0002_role.sql` (convention observée : `0001_baseline.sql`, préfixe numérique `NNNN_slug.sql`). Ajoute `role` sur `public.profiles` + durcit la policy update.
- **AC1 (types)** : `database.types.ts:18-35` — ajouter `role` dans Row/Insert/Update de `profiles` (édition manuelle).
- **AC3 (lecture serveur)** : nouveau helper `getRole(userId)` dans `lib/data/identity.ts` (même pattern que `getAvatarUrl` ligne 38-46) ou nouveau `lib/data/role.ts` — `select("role").eq("id", userId).maybeSingle()`.
- **AC2 (route)** : nouveau `app/[locale]/(app)/admin/page.tsx` (sous le groupe `(app)` protégé), qui appelle `getUser()` puis `getRole()` et `redirect`/`notFound` si ≠ `admin`. S'appuyer sur `redirect` de `@/i18n/navigation` (dashboard/page.tsx:2) ou `notFound()` de `next/navigation` (locale/layout.tsx:4,38) pour un 404.
- **AC2 (middleware auth)** : `proxy.ts:9` — ajouter `"/admin"` à `PROTECTED` (impose la session ; le gate rôle reste dans la page).
- **Nav (optionnel)** : `components/app/app-sidebar.tsx:29-32` `ITEMS` + `ICONS:12` si on veut afficher le lien admin (conditionné au rôle — sinon on n'expose pas l'entrée aux users).
- **i18n** : `messages/en.json` + `messages/fr.json`, namespace `appNav` (en.json:6) et un namespace `admin` à créer pour tout texte de la page/refus (fr+en ensemble).

## Verified APIs / functions

- `getUser(): Promise<User | null>` — `lib/supabase/server.ts:35`. Identité de session.
- `createClient()` — `lib/supabase/server.ts:8` (anon, RLS) ; `createServiceRoleClient()` — réexporté `server.ts:5`, défini `lib/supabase/service-role.ts` (bypass RLS, server-only).
- `getAvatarUrl(userId)` / `getDisplayName(userId, meta)` — `lib/data/identity.ts:38,12` (modèle exact pour `getRole`).
- `loadDashboard(userId)` — `lib/data/dashboard.ts:12`.
- `redirect({ href, locale })` — `@/i18n/navigation` (usage : `dashboard/page.tsx:19`). `notFound()` — `next/navigation` (usage : `layout.tsx:38`).
- `setRequestLocale`, `getTranslations` — `next-intl/server` (pattern page : `dashboard/page.tsx:1,14`).
- Pattern select profil : `.from("profiles").select("<col>").eq("id", userId).maybeSingle()` (identity.ts:17-21).
- Policies existantes : `profiles_select_own` / `profiles_insert_own` / `profiles_update_own` (`0001_baseline.sql:15-31`).

## Traps & constraints

- **[SÉCURITÉ — le point dur] Self-promotion.** `profiles_update_own` (`0001_baseline.sql:27-31`) laisse un user écrire toute colonne de sa ligne, et `settings.ts:28` fait déjà un upsert anon sur `profiles`. Une colonne `role` naïve = un user peut se faire `admin`. La migration `0002` doit **interdire au user d'écrire/modifier `role`** — options : (a) `WITH CHECK` sur la policy update qui vérifie que `role` ne change pas (comparer à la valeur existante, ou restreindre les colonnes), (b) trigger `BEFORE UPDATE` qui réinitialise `role` si l'appelant n'est pas service-role, (c) laisser `role` non modifiable côté user et n'autoriser sa mutation que par service-role/RPC `SECURITY DEFINER` (ADR 004). Le changement de rôle n'a de toute façon aucune UI dans le périmètre (fait à la main en DB) — donc « role non-user-writable » suffit.
- **[SÉCURITÉ] `settings.ts` upsert.** Vérifier que l'upsert existant (`settings.ts:28`, colonnes `id`,`display_name`) ne réinitialise/écrase pas `role`. Un `upsert` partiel ne touche pas les colonnes absentes, mais le `WITH CHECK`/trigger doit rester cohérent avec cette action.
- **[GRAVEYARD] Pas de RBAC/CASL, pas de table `permissions`, pas de rôles multiples.** Enum Postgres 2 valeurs (`user`/`admin`) OU `text` + `CHECK (role in ('user','admin'))` — au choix ; l'enum est plus explicite mais ajoute un type dans `database.types.ts` (`Enums`). Le `text + CHECK` est plus léger à typer à la main (`role: "user" | "admin"`). NE PAS aller au-delà.
- **[TYPES] Pas de DB live / pas de `supabase gen types`.** L'implémenteur doit éditer `database.types.ts` à la main (Row/Insert/Update, + `Enums.profiles_role` si enum). Aucun script à lancer ; à flaguer dans le plan pour ne pas attendre une régénération auto.
- **[i18n] fr+en ensemble.** Toute copie de la page `/admin` et du message de refus (si page 403 stylée plutôt que redirect) passe par des clés i18n dans `messages/fr.json` ET `messages/en.json`. `messages.test.ts` vérifie probablement la parité des clés (à respecter).
- **[TOKENS] Pas de couleur brute.** Toute UI `/admin` compose les primitives `components/ui/*` et les tokens `@theme` — `check-design-tokens.mjs` (prebuild) casse sinon (ADR 002).
- **[TESTS] Vitest colocalisés.** Tests existants : `identity.test.ts`, `settings.test.ts`, `messages.test.ts`, `app-sidebar.test.ts`. Un test de `getRole` + un test du gate (`admin` passe / `user` refusé) sont attendus.
- **[i18n nav] `@/i18n/navigation`, jamais `next/link`.** Si un lien admin est ajouté à la sidebar (`app-sidebar.tsx:7` importe déjà `Link` de `@/i18n/navigation`).
- **[RLS] Lecture du `role`.** `profiles_select_own` (`0001_baseline.sql:15-18`) permet à un user de lire sa propre ligne → `getRole` via `createClient()` (anon) fonctionne pour l'auto-lecture. Pas besoin de service-role pour lire son propre rôle.

## Open questions

- **Refus AC2 : redirect vs 403 ?** La story accepte les deux. Décision de plan : `notFound()` (404, ne révèle pas l'existence de `/admin`) est le plus propre et réutilise `next/navigation` ; alternative `redirect` vers `/dashboard`. Pas bloquant — à trancher au plan.
- **Enum Postgres vs `text + CHECK` ?** Recommandation : `text + CHECK (role in ('user','admin')) default 'user' not null` — plus simple à typer à la main dans `database.types.ts` (pas de bloc `Enums`), suffisant pour 2 valeurs. À valider au plan.
- **Mécanisme anti-promotion précis (policy `WITH CHECK` vs trigger) ?** Deux implémentations valides ; le trigger `BEFORE UPDATE` réinitialisant `role` pour non-service-role est le plus robuste face à l'upsert `settings.ts`. À arrêter au plan (une seule ligne de SQL de différence, pas un split).
- **Y a-t-il déjà un admin de test ?** Aucun user seed. La promotion d'un compte en `admin` se fait manuellement en DB (SQL / dashboard Supabase) — à documenter, pas à coder.

## Real complexity

Annoncée **1** dans `docs/stories.md:104`. **Verdict : 2.**
La story n'est pas « lire un champ existant » (l'hypothèse implicite d'un score 1) : `role` **n'existe pas encore** (fait 1), donc elle porte **une migration `0002` + une édition manuelle de `database.types.ts`** (fait 5) **+ un durcissement RLS non trivial contre la self-promotion** (fait 4, le vrai point de sécurité). Route + gate serveur sont, eux, du copier-adapter d'un pattern déjà en place (facile). L'écart 1→2 vient entièrement du couple **migration + types manuels + RLS anti-promotion**, pas du volume de code. Reste très en dessous d'un 3 : périmètre étroit, un seul mécanisme, pas de RBAC.

## Split proposal

Sans objet (verdict 2, non 5). Un seul cycle Research → Plan → Execute → Review → Ship.
