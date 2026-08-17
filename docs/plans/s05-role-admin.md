---
validated: yes
---

# Plan — Story s05-role-admin

Branch: `feature/s05-role-admin`
Research: `docs/research/s05-role-admin.md` — read it first; this plan does not repeat it.

## Target story

Une zone `/admin` réservée aux admins : back-office minimal, inaccessible aux users normaux. Un seul champ `role` (`user`/`admin`), **pas de RBAC/CASL** (graveyard). Dépend de s04 (app-shell) mergé.

Acceptance criteria :

- **AC1** — Chaque utilisateur a un champ `role`, défaut `user` (migration Supabase).
- **AC2** — Un `admin` accède à `/admin` ; un `user` reçoit un refus (403 ou redirection).
- **AC3** — Le rôle est lu **côté serveur** (pas seulement client) pour la protection.

## Tasks (ordered)

1. [x] **Migration `supabase/migrations/0002_role.sql` — colonne + durcissement anti-promotion.**
   - Ajouter la colonne : `alter table public.profiles add column role text not null default 'user' check (role in ('user','admin'));`
     (choix `text + CHECK` plutôt qu'enum Postgres : plus léger à typer à la main dans `database.types.ts`, pas de bloc `Enums` à maintenir — cf. research §Open questions. Deux valeurs suffisent, graveyard.)
   - **Durcir contre la self-promotion — mécanisme retenu : remplacer la policy `profiles_update_own` par une variante dont le `WITH CHECK` interdit tout changement de `role`.** L'ancienne `profiles_update_own` (`0001_baseline.sql:27-31`) laisse un user écrire _toutes_ les colonnes de sa ligne, y compris `role` ; combinée à l'upsert anon de `updateSettingsProfile` (`lib/actions/settings.ts:22-30`), un user peut se faire `admin`. Intent SQL, sans ambiguïté :
     ```
     drop policy "profiles_update_own" on public.profiles;
     create policy "profiles_update_own"
       on public.profiles
       for update
       using (auth.uid() = id)
       with check (
         auth.uid() = id
         and role = (select p.role from public.profiles p where p.id = profiles.id)
       );
     ```
     Le `WITH CHECK` compare la nouvelle valeur de `role` à celle déjà en base : elle doit rester identique. `display_name`/`avatar_url` restent librement modifiables. Un `UPDATE` (ou l'upsert de settings, qui est un UPDATE sur conflit) qui tenterait de changer `role` est rejeté par RLS. Le service-role (webhooks, promotion out-of-band) **bypasse la RLS** → la promotion reste possible côté admin/SQL.
   - **Justification du choix (policy `WITH CHECK` vs trigger).** La policy est la plus simple : une seule primitive Postgres (RLS, déjà le langage de sécurité de la baseline), zéro objet nouveau (pas de fonction ni de trigger à auditer), et elle échoue _fermé_ — refuse l'écriture au lieu de la réécrire silencieusement. Elle est alignée ADR 004 : la mutation sensible (`role`) est réservée au chemin privilégié (service-role / SQL), l'app n'a aucune porte pour l'écrire. Un trigger `BEFORE UPDATE` serait équivalent mais ajoute un objet et une fonction `SECURITY DEFINER` sans bénéfice ici (pas de logique atomique multi-lignes). **Note graveyard : aucune UI ne pose `role` — la promotion est out-of-band (SQL/service-role). Ne créer ni écran, ni action, ni RPC de promotion.**
   - Vérifier que l'upsert de `settings.ts` reste vert : il n'écrit que `id` + `display_name`, ne touche pas `role`, donc `role = old.role` est trivialement satisfait. Ne PAS modifier `settings.ts`.

2. [x] **Hand-edit `database.types.ts` — aligner les types sur la migration.**
   - Dans `profiles.Row` : ajouter `role: "user" | "admin"` (non-nullable, la colonne est `not null default`).
   - Dans `profiles.Insert` : ajouter `role?: "user" | "admin"` (optionnel — default en base).
   - Dans `profiles.Update` : ajouter `role?: "user" | "admin"` (optionnel).
   - **Édition MANUELLE et obligatoire : il n'existe aucun script `supabase gen types` dans ce repo** (`package.json` n'a que `dev/build/test/typecheck/lint`) — le type ne se régénère pas tout seul. Il DOIT rester le miroir exact du `CHECK (role in ('user','admin'))` de la tâche 1 ; l'union littérale reflète le CHECK. Pas de bloc `Enums` (choix `text + CHECK`).

3. [x] **`getRole(userId)` — lecture serveur du rôle, dans `lib/data/identity.ts`.**
   - Ajouter à côté de `getAvatarUrl` (même module, déjà `import "server-only"` en tête, ligne 1) :
     `const supabase = await createClient()` → `.from("profiles").select("role").eq("id", userId).maybeSingle()`.
   - Signature : `getRole(userId: string): Promise<"user" | "admin">`. Retourne `data?.role ?? "user"` — **défaut `user`** si la ligne est absente ou `role` null (fail-safe : jamais admin par défaut). Miroir exact du pattern `getAvatarUrl` (`identity.ts:38-46`).
   - L'appelant dérive `userId` de `getUser()` (session), jamais d'un argument client — cf. tâche 4.

4. [x] **Route `app/[locale]/(app)/admin/page.tsx` — gate serveur (AC2).**
   - Server component sous le groupe `(app)` (donc déjà couvert par le layout auth + `ensureProfile`). Pattern calqué sur `dashboard/page.tsx` : `await params` → `setRequestLocale(locale)` → `getTranslations("admin")` + `getTranslations("appNav")` si besoin du header.
   - Gate : `const user = await getUser()` ; si `!user` → `redirect({ href: "/login", locale })` (comme dashboard). Puis `const role = await getRole(user.id)` ; **si `role !== "admin"` → `notFound()`** (`next/navigation`, déjà utilisé dans `app/[locale]/layout.tsx:38`) — 404 qui ne révèle pas l'existence de `/admin` (décision de plan, cf. research §Open questions ; `redirect` vers `/dashboard` était l'alternative acceptée).
   - **Extraire la décision de gate en prédicat pur testable** : une petite fonction `isAdmin(role: "user" | "admin"): boolean` (colocalisée dans le module admin, ou dans `identity.ts`) → `role === "admin"`. La page appelle `if (!isAdmin(role)) notFound()`. Cela garde le test honnête sans DOM runner (cf. tâche 6).
   - UI : placeholder minimal **tokens-only** (composer les primitives `components/ui/*` + tokens `@theme` ; réutiliser `AppHeader` comme dashboard). **Aucune string en dur** : tout texte via clés i18n du namespace `admin`.

5. [x] **i18n — namespace `admin` dans `messages/fr.json` ET `messages/en.json`.**
   - Ajouter un namespace `admin` avec les clés de la page placeholder (p.ex. `title`, `subtitle`) — fr + en **mis à jour ensemble**. Le test de parité (`messages/messages.test.ts`) vérifie automatiquement que les deux locales exposent les mêmes clés → il échouera si une locale manque une clé.

6. [x] **`proxy.ts` — ajouter `/admin` à la couche AUTH uniquement.**
   - Ajouter `"/admin"` à `PROTECTED` (`proxy.ts:9`) → impose une session (redirect `/login` sinon), comme `/dashboard` et `/settings`.
   - **Le gate RÔLE reste dans la page (tâche 4), PAS dans le middleware** : le middleware ne lit pas la DB (règle « rien entre `createServerClient` et `getUser` », `proxy.ts:38`) et n'a pas accès fiable au `role`. Ne PAS toucher les entrées existantes de `PROTECTED` ni la logique de redirection.

7. [x] **Tests (Vitest, colocalisés, altitude unitaire).**
   - `lib/data/identity.test.ts` (étendre) : `getRole` — mock du client Supabase serveur comme `settings.test.ts`/`identity.test.ts` (chaîne `from → select → eq → maybeSingle`). Cas : `role: "admin"` → `"admin"` ; `role: "user"` → `"user"` ; ligne absente (`data: null`) → `"user"` ; `role` null → `"user"`.
   - Prédicat `isAdmin` : pur, sans mock — `isAdmin("admin") === true`, `isAdmin("user") === false`. C'est l'assertion honnête de la décision de gate (la page appelle `notFound()` ssi `!isAdmin(role)`), au même niveau que les tests de fonctions pures existants (`initialsOf`).
   - i18n : le test de parité existant (`messages/messages.test.ts`) couvre déjà le namespace `admin` — vérifier qu'il passe (fr+en). Ne pas écrire de test i18n redondant.

## Run interdicts

- **Pas de RBAC/CASL, pas de table `permissions`/`roles`, pas de policy-engine, pas de rôles multiples** — une seule colonne `role text CHECK in ('user','admin')`. (graveyard, reviewer-vérifiable : grep aucune table/lib de permissions.)
- **`role` NON user-writable** : le durcissement RLS de la tâche 1 est obligatoire. Une colonne `role` avec la policy `profiles_update_own` d'origine intacte = FAIL (self-promotion via `settings.ts`).
- **Identité dérivée de `getUser()` côté serveur** : le gate ne prend jamais un `role` ni un `userId` venant du client.
- **`database.types.ts` doit correspondre exactement à la migration** (union `"user" | "admin"` ↔ `CHECK`). Divergence = FAIL.
- **Aucune nouvelle dépendance npm.** Ne pas modifier `package.json`.
- **`/admin` : tokens-only + i18n fr+en.** Aucune couleur/valeur brute (le `check-design-tokens.mjs` du prebuild casse le build sinon). **Ne PAS toucher `scripts/check-design-tokens.mjs`.**
- **Ne pas affaiblir `proxy.ts`** : n'ajouter que `"/admin"` à `PROTECTED`, ne retirer/modifier aucune entrée ni logique existante.
- **Ne pas modifier `lib/actions/settings.ts`** (l'upsert reste compatible avec le nouveau `WITH CHECK`).
- **Pas de 2FA/OTP, pas d'UI/action/RPC de promotion de rôle** (out-of-band uniquement).
- **Pas de DB live supposée** : la migration ne s'exécute pas ici, elle **ship comme fichier**, appliquée à la main sur un vrai projet → à porter en « Not verified » du review.

## The point everything turns on

Le plan tient sur **un seul mécanisme anti-self-promotion : le `WITH CHECK` de `profiles_update_own` qui gèle `role`**. Trois endroits où il peut être faux, et à quoi les comparer :

1. **La sous-requête `role = (select ... where p.id = profiles.id)`** — vérifier qu'elle référence bien la _ligne courante_ et compare l'ancienne valeur (sémantique `OLD`) et non la nouvelle. À comparer au comportement Postgres du `WITH CHECK` (évalué sur la ligne proposée) : si la formulation ne capture pas l'ancienne valeur, un user pourrait passer `role='admin'`. Le review doit raisonner sur la sémantique RLS, pas juste lire le SQL.
2. **L'upsert de `settings.ts` (`upsert ... onConflict:id`)** — c'est un UPDATE sur conflit, donc soumis au `WITH CHECK`. Comparer : il n'écrit pas `role`, donc `role` reste inchangé et la policy passe. Si un implémenteur ajoutait `role` à cet upsert, ça casserait — à surveiller que `settings.ts` reste intact.
3. **`database.types.ts` vs migration** — l'union littérale `"user" | "admin"` doit refléter le `CHECK`. Édition manuelle, pas de gen : le review doit _eyeball_ que les deux fichiers s'accordent (colonne, nullabilité, valeurs).

## Files touched

- `supabase/migrations/0002_role.sql` (nouveau) — colonne `role` + policy update durcie.
- `database.types.ts` (édité) — `role` dans Row/Insert/Update de `profiles`.
- `lib/data/identity.ts` (édité) — `getRole()` + `isAdmin()`.
- `app/[locale]/(app)/admin/page.tsx` (nouveau) — page gate + placeholder.
- `proxy.ts` (édité) — `"/admin"` dans `PROTECTED`.
- `messages/fr.json`, `messages/en.json` (édités) — namespace `admin`.
- `lib/data/identity.test.ts` (étendu) — tests `getRole` + `isAdmin`.

## Test strategy

Altitude unitaire, style repo (Vitest colocalisé, mocks du client Supabase comme `settings.test.ts`).

- **`getRole`** : mock `from → select → eq → maybeSingle` ; admin→admin, user→user, absent/null→user (fail-safe).
- **`isAdmin`** (prédicat pur extrait) : true pour admin, false pour user — assertion honnête de la décision de gate sans DOM runner.
- **i18n parité** : couverte par `messages/messages.test.ts` existant (fr/en, namespace `admin` inclus automatiquement).
- **Non testé (à porter au review en « Not verified »)** : l'application effective de la migration `0002_role.sql` sur une vraie DB et le rejet RLS réel de la self-promotion (pas de DB live dans cet env — la migration ship comme fichier, appliquée à la main). Le review doit _eyeball_ la cohérence migration ↔ `database.types.ts`.

## Definition of Done

- Migration `0002_role.sql` : colonne `role` défaut `user` + policy update qui gèle `role` (AC1, self-promotion fermée).
- `/admin` : admin passe, non-admin reçoit `notFound()`, rôle lu côté serveur via `getRole` (AC2, AC3).
- `database.types.ts` aligné manuellement sur la migration.
- Tests verts (`getRole`, `isAdmin`, parité i18n) ; `typecheck` + `lint` + `check-design-tokens` OK ; pas de régression.
- Un seul commit de story portant research + plan + code ; diff lisible.
- Review passée sans critique ouverte ; déploiement (migration appliquée à la main) hors périmètre de cet env, tracé en « Not verified ».
