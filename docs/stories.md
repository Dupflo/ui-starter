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
- Origine : **fork d'`applyzi-flagship/`** (c'est la source du code). Target ref (spec seulement) : l'arborescence Next.js générique d'un SaaS type ship-saas.now sert de repère pour ce qui doit rester après le strip, pas de code à copier.

---

## Story s02-design-tokens-retheme — Re-theme par un seul fichier de tokens

**As a** builder **I want** changer toute la palette de l'app en éditant un seul fichier de tokens **so that** chaque SaaS forké obtient son identité visuelle en quelques secondes.

### Complexity

3

### Acceptance criteria

- [ ] Une source unique de tokens (fichier de thème Tailwind 4 `@theme`) définit la palette.
- [ ] Modifier les valeurs de palette met à jour tous les composants/écrans présents à ce stade sans toucher à leur code (garantie de plomberie tokens) ; les écrans construits plus tard (app shell s04, landing s07) héritent automatiquement de la palette et sont re-vérifiés à leur arrivée.
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
- Story de finalisation : elle ne réécrit pas les écrans amont, elle **vérifie et complète** leur couverture i18n. Les stories s03/s04/s06/s07 exposent déjà leurs textes via des clés i18n (pas d'overlap : chacune possède ses clés, s08 possède la garantie de couverture fr+en).
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

---

## Story s10-defect-sweep — Purge des défauts hérités du fork

**As a** builder **I want** que les défauts hérités d'Applyzi encore présents dans le starter livré soient corrigés, **so that** aucun SaaS forké ne les propage.

### Complexity

2

### Acceptance criteria

- [ ] **Impression** : `/cgv` (et toute page) s'imprime lisible. Aujourd'hui `app/globals.css` conserve la couche print du domaine CV — `body > * { display: none !important }` masque tout et `body > #cv-print { display: block }` ré-affiche un élément qui n'existe plus : **toutes les pages s'impriment blanches**. Vérifier sur la feuille de style émise qu'aucune règle print ne masque `body > *`, et que le texte imprimé est foncé sur fond clair (pas de blanc sur blanc).
- [ ] **`import "server-only"`** présent sur `lib/supabase/service-role.ts` — le client qui contourne les RLS, nommément sous surveillance dans l'ADR 004, et le seul module sensible sans garde-fou (ses 10 voisins l'ont). Prouver que le garde-fou se déclenche vraiment : un Client Component qui l'importe doit faire échouer le build.
- [ ] Le ré-export mort `createServiceRoleClient` dans `lib/supabase/server.ts:5` est supprimé (aucun consommateur ne l'utilise ; il rend le module serveur générique transitivement server-only).
- [ ] **Wordmark lisible partout** : `app/[locale]/pricing/page.tsx` rend `<Logo />` (variant `dark`, prévu pour les fonds pine) sur un `<main className="bg-paper">` — le texte et le fond résolvent vers le même token, contraste 1:1. Auditer les 4 call sites et vérifier, sur la feuille de style compilée, qu'aucun n'a le token du wordmark égal à celui de son fond, en clair **et** en sombre.
- [ ] **Zéro branding Applyzi dans le code** : `git grep -in applyzi -- app components lib public scripts` ne renvoie plus que des regex de garde de tests. Couvre `public/favicon.svg` (encore la marque Applyzi, visible dans l'onglet), `components/cookie-banner.tsx`, `scripts/backup-prod.sh` (qui embarque une vraie référence de projet Supabase prod), et le commentaire onboarding de `app/globals.css`.
- [ ] **Polices** : soit les webfonts du design system se chargent réellement en build de production (`@font-face` émis, fichiers dans `.next/static/media`), soit `docs/design-system.md` est corrigé pour décrire ce qui est réellement livré. Les deux `@import` distants actuels ne survivent pas au build — à vérifier avant de choisir.
- [ ] `npm run test`, `lint:design`, `typecheck`, `build`, `lint` passent.

### Dependencies

Aucune (corrige du code déjà mergé sur `main`).

### Agentic notes

- Origine : audit en contexte frais du 28/08/2026, 5 passes. Les défauts sont hérités du fork `applyzi-flagship` et ont traversé les reviews de s01 à s08 sans être vus.
- **Trap** : la couche print est volontairement **hors `@layer`**, donc elle bat tous les utilitaires Tailwind. La supprimer ne suffit pas — vérifier la feuille émise, pas la source.
- **Trap** : `body` fixe `color: var(--color-paper)`. Un reset print qui force `background:#fff` sans forcer `color` reproduit le bug du wordmark dans un autre médium.
- **Trap** : `--color-cat-sector*` est utilisé par `components/ui/badge.tsx` — ne pas le supprimer avec les autres tokens `cat-*` du registre CV.
- **Trap** : `server-only` n'est pas un package npm ici — Next l'alias sur `next/dist/compiled/server-only`, et `vitest.config.ts` le stubbe. Ne pas l'ajouter à `package.json`.
- **Risk** : ces fichiers appartiennent au périmètre de s02 (tokens) ; ne pas re-thémer au passage, seulement purger.

---

## Story s11-demo-mode — Mode démo sans base de données

**As a** builder **I want** lancer le starter entier sans Supabase ni Stripe configurés, avec des données fictives et des parcours cliquables, **so that** je peux voir et recetter l'app complète (et la démontrer) avant d'avoir branché la moindre clé.

### Complexity

4

### Acceptance criteria

- [ ] `npm run dev:demo` et `npm run start:demo` démarrent l'app **sans aucune variable Supabase/Stripe** définie — zéro crash, zéro écran d'erreur.
- [ ] Un bandeau « mode démo » persistant signale que les données sont fictives.
- [ ] Tous les écrans livrés (landing, pricing, login/signup, dashboard, settings, admin, pages légales) rendent des données fictives cohérentes (utilisateur, abonnement, rôle).
- [ ] Les parcours sont **interactifs en mémoire** : connexion (n'importe quel email), déconnexion, bascule de rôle `user`↔`admin`, souscription simulée qui débloque le contenu gated, bascule fr/en. L'état se réinitialise au redémarrage du serveur.
- [ ] Hors mode démo, le comportement est **strictement inchangé** : aucun chemin de code démo atteignable quand le flag est absent, et l'absence de config réelle échoue comme avant.
- [ ] `npm run test`, `lint:design`, `typecheck`, `build` passent.

### Dependencies

s01 à s08 (tous les écrans doivent exister pour être peuplés), s10-defect-sweep. **À livrer avant s09** pour que le projet généré par `init` embarque le mode démo.

### Agentic notes

- Un seul interrupteur serveur (ex. `DEMO_MODE=1` posé par les scripts npm), lu en un point unique ; les adapters démo se branchent derrière les abstractions existantes — pas de `if (demo)` éparpillé dans les composants.
- Fixtures typées avec `Database`, pour que le compilateur garantisse la cohérence avec les vrais adapters.
- État mutable en mémoire côté serveur + cookie de session démo : il ne survit pas à un restart, c'est un critère assumé.
- **Trap** : les trois clients Supabase et le webhook Stripe lèvent si les env vars manquent — c'est exactement ce qu'il faut court-circuiter, sans affaiblir le chemin de production.
- **Trap** : `proxy.ts` rafraîchit la session Supabase ; le mode démo doit fournir sa propre identité sans casser la règle « rien entre `createServerClient` et `getUser()` » sur le chemin réel.
- **Risk** : le mode démo est un chemin d'exécution parallèle — le risque n°1 est qu'il fuite en production. Tester explicitement que le flag absent = comportement d'origine.
- Aucune string UI en dur (bandeau + menu démo passent par i18n fr+en), aucune couleur hors tokens.
