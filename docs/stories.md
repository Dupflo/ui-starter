# User Stories — ui-starter

> One story = one shippable slice, written to be executed by an agent.
> Id format: `s<number>-<short-slug>` — reused in every pipeline file and in the branch name.
> Source PRD: docs/prd.md · Target spec: ship-saas.now (https://ship-saas.now/fr) · Base à forker: `applyzi-flagship/`

---

## Story s01-base-fork — Base starter propre et neutre
**As a** builder **I want** une base dérivée d'Applyzi, débarrassée de son domaine métier, **so that** j'ai une fondation neutre qui build et démarre pour n'importe quel SaaS.

### Complexity
3

### Acceptance criteria
- [ ] `npm run build` réussit et `npm run dev` démarre sans erreur.
- [ ] Aucune dépendance Applyzi-spécifique dans `package.json` : `@myriaddreamin/typst*`, `apify-client`, `pdf-parse`, `mammoth` absentes.
- [ ] Aucun chemin de code CV/Typst restant (services, components, scripts de rendu CV supprimés).
- [ ] La home affiche un placeholder neutre — zéro branding/contenu Applyzi CV.
- [ ] `npm run test` (Vitest) passe au vert.
- [ ] `.env.local.example` présent avec les clés génériques Supabase + Stripe (pas de secret Applyzi).

### Dependencies
Aucune.

### Agentic notes
- Dériver de `applyzi-flagship/`. **Garder** : Next.js 16, adapters Supabase, Stripe, Tailwind 4 + tokens, next-intl, react-hook-form + zod, Vitest, husky/eslint/prettier.
- **Strip** : `scripts/sync-cv-assets.mjs`, `videos/`, `rpi/` (si CV), services/components CV, deps typst/apify/pdf-parse/mammoth.
- **Trap** : les hooks `predev`/`prebuild` appellent `sync-cv-assets.mjs` (à retirer) et `check-design-tokens.mjs` (à garder, sert à s02).
- **Risk** : suppression large → vérifier qu'aucun import cassé ne subsiste (typecheck + build doivent rester verts).
- Target ref : structure de projet de ship-saas.now (arborescence Next.js d'un SaaS générique).

---

## Story s02-design-tokens-retheme — Re-theme par un seul fichier de tokens
**As a** builder **I want** changer toute la palette de l'app en éditant un seul fichier de tokens **so that** chaque SaaS forké obtient son identité visuelle en quelques secondes.

### Complexity
3

### Acceptance criteria
- [ ] Une source unique de tokens (fichier de thème Tailwind 4 `@theme`) définit la palette.
- [ ] Modifier les valeurs de palette met à jour landing + app shell + composants sans toucher au code des composants.
- [ ] `npm run lint:design` (`check-design-tokens`) passe, et échoue si une couleur brute (hex/rgb) est utilisée hors tokens.
- [ ] Un court doc (`docs/` ou README) explique comment re-thémer en 1 étape.

### Dependencies
s01-base-fork.

### Agentic notes
- S'appuyer sur `scripts/check-design-tokens.mjs` déjà présent ; l'étendre en garde-fou (interdire les couleurs hors tokens).
- Tailwind 4 : tokens via `@theme`. Après le strip s01, s'assurer qu'aucune couleur codée en dur ne subsiste dans les composants réutilisés.
- Tête d'affiche de l'angle PRD : « je change une palette, tout l'UI suit ».

---

## Story s03-auth — Inscription, connexion, déconnexion
**As an** end-user d'un SaaS forké **I want** m'inscrire, me connecter et me déconnecter **so that** j'accède à l'app de façon sécurisée.

### Complexity
2

### Acceptance criteria
- [ ] L'inscription email/mot de passe crée un utilisateur Supabase et ouvre une session.
- [ ] La connexion authentifie et redirige vers le dashboard ; des identifiants invalides affichent une erreur et ne connectent pas.
- [ ] La déconnexion efface la session ; toute route protégée redirige alors vers login.
- [ ] La session persiste au rechargement (SSR).

### Dependencies
s01-base-fork.

### Agentic notes
- Supabase SSR déjà câblé dans les adapters d'Applyzi (`adapters/`, `@supabase/ssr`) — réutiliser, ne pas réécrire.
- Écrans : signup, login, logout. Utiliser react-hook-form + zod pour la validation.
- Target ref : écrans d'auth de ship-saas.now. **Hors périmètre (graveyard)** : 2FA/OTP.

---

## Story s04-app-shell — Squelette d'app protégé
**As a** logged-in user **I want** un layout d'app protégé avec nav et menu utilisateur **so that** j'ai un espace où brancher les features.

### Complexity
2

### Acceptance criteria
- [ ] Un accès non authentifié à `/dashboard` (route protégée) redirige vers login.
- [ ] Un utilisateur connecté voit le layout avec navigation + menu utilisateur (email affiché, action déconnexion).
- [ ] Le layout utilise exclusivement les design tokens (aucune couleur brute).

### Dependencies
s03-auth.

### Agentic notes
- Protection de route via middleware Next.js + session Supabase serveur.
- Réutiliser les composants de layout/nav d'Applyzi en les neutralisant (sans domaine CV).
- Target ref : shell/dashboard de ship-saas.now.

---

## Story s05-role-admin — Rôle minimal user/admin
**As an** admin **I want** une zone réservée aux admins **so that** j'ai un back-office basique, inaccessible aux utilisateurs normaux.

### Complexity
1

### Acceptance criteria
- [ ] Chaque utilisateur a un champ `role` avec valeur par défaut `user` (migration Supabase).
- [ ] Un `admin` accède à `/admin` ; un `user` reçoit un refus (403 ou redirection).
- [ ] Le rôle est lu côté serveur (pas seulement client) pour la protection.

### Dependencies
s04-app-shell.

### Agentic notes
- **Simple enum/booléen**, pas de RBAC/CASL (graveyard). Une colonne `role` suffit.
- Migration : ajouter `role` sur la table users/profiles Supabase, défaut `user`.
- Target ref : ⚠️ NE PAS répliquer le RBAC de ship-saas.now (graveyard) — version minimale uniquement.

---

## Story s06-stripe-billing — Abonnement Stripe de bout en bout
**As an** end-user **I want** souscrire à un plan payant **so that** j'accède aux features payantes, et l'app connaît mon statut d'abonnement.

### Complexity
4

### Acceptance criteria
- [ ] La page pricing propose 1–2 plans ; le clic ouvre Stripe Checkout.
- [ ] Un paiement réussi crée/à-jour un enregistrement d'abonnement lié à l'utilisateur.
- [ ] Le webhook Stripe met à jour le statut (`active`/`canceled`), avec vérification de signature et **idempotence** (rejouer l'event ne duplique rien).
- [ ] Un élément gated n'est visible que pour un abonné `active`.

### Dependencies
s04-app-shell (auth + utilisateur requis).

### Agentic notes
- Stripe (`stripe@22`) déjà présent dans Applyzi — réutiliser la config.
- **Risk (4)** : sécurité + fiabilité du webhook — vérification de la signature, idempotence, test local via Stripe CLI (`stripe listen`). C'est le point dur de la story.
- Rester sur l'abonnement (subscriptions) ; le one-time payment n'est pas requis au départ.
- Table `subscriptions` (user_id, stripe_customer_id, status, plan) via migration.
- Target ref : flow pricing → checkout → webhook de ship-saas.now. **Graveyard** : guest checkout, multi-plans complexes.

---

## Story s07-landing — Landing scaffold
**As a** visitor **I want** une landing avec hero, pricing et CTA **so that** le SaaS peut présenter son offre et convertir.

### Complexity
2

### Acceptance criteria
- [ ] La landing rend un hero, une section pricing (mêmes plans que la config Stripe) et un CTA.
- [ ] Le CTA de pricing route vers l'inscription/checkout.
- [ ] La landing utilise les design tokens et est responsive.
- [ ] Les textes passent par les clés i18n (prêts pour fr/en).

### Dependencies
s02-design-tokens-retheme, s06-stripe-billing.

### Agentic notes
- Landing **minimale** (scaffold), pas une landing de vente marketing complète (celle de ship-saas est graveyard : c'est du go-to-market produit-à-vendre).
- La section pricing lit la même source de plans que s06 pour éviter la divergence.
- Target ref : structure de landing d'un SaaS générique (hero/pricing/CTA).

---

## Story s08-i18n — Bascule de langue fr/en
**As a** user **I want** utiliser l'app en français ou en anglais **so that** je choisis ma langue.

### Complexity
1

### Acceptance criteria
- [ ] Un sélecteur de langue bascule entre fr et en.
- [ ] Tous les écrans livrés (landing, auth, dashboard) ont leurs strings en fr ET en en ; aucune clé manquante à l'exécution.
- [ ] La langue choisie persiste (cookie/URL locale).

### Dependencies
s03-auth, s04-app-shell, s07-landing.

### Agentic notes
- next-intl déjà présent dans Applyzi — réutiliser l'infra (`messages/`, `i18n/`).
- Story de finalisation : elle vérifie la couverture i18n des écrans construits en amont.
- Trap : les strings ajoutés en s03/s04/s06/s07 doivent tous exister dans les deux locales.

---

## Story s09-init-command — Init/fork en une commande, pipeline pré-câblé
**As a** builder **I want** une commande `init` qui scaffolde un nouveau SaaS depuis le starter avec le pipeline killer-saas prêt **so that** je démarre un nouveau projet en une commande.

### Complexity
3

### Acceptance criteria
- [ ] `init <name>` produit un nouveau dossier projet qui build et démarre sans erreur.
- [ ] Le projet généré contient le pipeline killer-saas (templates/, commandes `.claude`, AGENTS.md) et `/ks-status` s'exécute dedans.
- [ ] Le projet généré a une palette placeholder prête à re-thémer (s02).
- [ ] Aucun artefact Applyzi-spécifique dans le projet généré.

### Dependencies
s01 à s08 (le starter doit être complet pour être forké).

### Agentic notes
- Script d'init : copie de la base starter + des fichiers pipeline (déjà présents à la racine yzi-suite : AGENTS.md, `templates/`, `.claude/`).
- Trap : le projet généré doit avoir son propre git propre (pas d'historique hérité), et le `check-design-tokens` doit passer.
- Concrétise l'angle PRD « plugin `init` en une commande ».
