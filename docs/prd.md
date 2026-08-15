# PRD — ui-starter (starter SaaS interne, forkable)

> Nom du projet : `ui-starter` — le kit de départ pour builder les SaaS de la yzi-suite.

## Target SaaS
**ship-saas.now** (https://ship-saas.now/fr) — boilerplate SaaS full-stack Next.js vendu €299–399 : auth (RBAC/2FA), multi-tenant, Stripe, PostgreSQL/Drizzle, Supabase storage, Inngest, admin dashboard, "50 AI conventions".

## Kill mode
**Remplacement interne.** Mon starter privé pour builder MES SaaS — pas de paywall, pas de landing de vente, pas de multi-client. Optimisé pour MON workflow : fork rapide, re-theme, méthodo killer-saas native. Le « plugin init/fork » reste un outil interne.
*Implication scope :* tout le go-to-market (landing de vente, licensing, onboarding acheteur, support, courses) est hors périmètre.

## Why kill it
- **Ce que ça coûte :** €299–399 one-time + une dépendance à un template externe que je ne contrôle pas (ses conventions, ses updates, son archi « Clean Architecture 3 couches »).
- **Ce qu'il fait mal pour mon cas :** template générique, pas *le mien*. Il ignore ma méthodo killer-saas, mon design (celui d'Applyzi) et mes conventions. Je repartirais de ses choix au lieu des miens.
- **Ce que je possède déjà (donc ne rachète pas) :** l'ossature complète est dans **Applyzi** — Next.js 16, Supabase (auth + DB + storage), Stripe, Tailwind 4 + design tokens, next-intl, react-hook-form + zod, Vitest.

## Problem
J'ai plusieurs SaaS à builder dans la yzi-suite. Aujourd'hui, démarrer un nouveau SaaS = soit repartir de zéro, soit acheter/subir un boilerplate externe qui coûte, que je ne maîtrise pas, et qui ignore mon design et ma méthode. Il me faut **une fondation unique, élégante, possédée et forkable**, pré-câblée avec le pipeline killer-saas.

## Target users
**Moi (Florian), builder solo de la yzi-suite.** Contexte d'usage : forker le starter → changer la palette → builder un nouveau SaaS via le pipeline killer-saas (PRD → … → Ship). Pas de client tiers, pas de segment de marché à ce stade.

## Perimeter — the 20% that matters

### Replicated (core loop)
| Feature | Complexity (1-5) | Why this score |
|---|---|---|
| **Design system re-themable** — swap de palette via tokens, repris d'Applyzi | 3 | Tokens déjà présents (`check-design-tokens.mjs`) ; à généraliser + rendre le swap couleur trivial. Tête d'affiche de l'angle. |
| **Auth** — signup email/password, login, logout, session (Supabase SSR) | 2 | Supabase SSR déjà câblé dans Applyzi. |
| **Rôle minimal `user`/`admin`** — simple booléen, pas de RBAC | 1 | Un flag, de quoi avoir un back-office basique. Pas de rôles fins. |
| **App shell protégé** — layout dashboard, nav, user menu, route protection | 2 | Squelette d'app authentifiée. |
| **Stripe billing** — checkout + abonnement + webhook, 1–2 plans | 4 | Intégration paiement (4), mais Stripe déjà dans Applyzi. Gagne sa place : cœur d'un SaaS. |
| **Landing scaffold** — hero, pricing branché Stripe, CTA (minimal) | 2 | Chaque SaaS a besoin d'une landing minimale. |
| **i18n fr/en** | 1 | next-intl déjà présent. |
| **`init` / fork + pipeline killer-saas pré-câblé** — docs/, commands, AGENTS.md | 3 | L'angle « plugin » : scaffolder un nouveau SaaS pré-thémé, méthodo prête à tourner. |

Scale: 1 trivial CRUD · 2 form + persistence + list · 3 business logic / several states · 4 integrations, payments, roles · 5 real-time, migrations, external systems.

### Explicitly NOT replicated (graveyard)
- **Multi-tenant / organisations / workspaces** (5) — inutile en solo pour un MVP.
- **RBAC / CASL (rôles fins)** (4) — le flag `user`/`admin` suffit.
- **2FA / OTP** (3).
- **Inngest** (4) — jobs / CRON / event automation.
- **Admin dashboard complet** (4) — gestion users/plans/revenus. (On garde juste le flag admin + un back-office minimal si besoin plus tard.)
- **Clean Architecture 3-couches stricte** — on réutilise les conventions Applyzi, pas celles de ship-saas.
- **Tout le go-to-market de ship-saas** — landing de vente, licensing/paiement d'accès, support acheteurs, Discord, courses/bundle.
- **Domaine Applyzi-spécifique** — Typst/rendu CV, apify, pdf-parse, mammoth : strippés du fork.

### The angle (done differently / better)
1. **Mon design, pas un template générique** — re-theming par tokens depuis l'UI Applyzi déjà élégante : je change une palette, tout l'UI suit.
2. **Méthodo killer-saas native** — ship-saas vend « 50 AI conventions » ; moi je livre un *pipeline complet* PRD→Ship pré-câblé dans le fork (docs/, commands, AGENTS.md).
3. **Zéro coût, 100% possédé** — forké depuis ce que je maîtrise (Applyzi), pas une boîte noire à €399.
4. **`init` en une commande** — un nouveau SaaS pré-thémé + pipeline prêt à tourner.

## Constraints
- **Stack imposé = celui d'Applyzi** : Next.js 16, React 19, Supabase, Stripe, Tailwind 4 + design tokens, next-intl, react-hook-form + zod, Vitest. Pas de nouvelle techno sans raison forte.
- **Origine du code** : dérivé d'Applyzi en strippant le domaine (Typst/CV, apify, pdf-parse, mammoth).
- **Solo, temps limité** — le périmètre doit rester le 20% qui compte.
- **Repo git à initialiser** — la yzi-suite n'est pas encore versionnée à sa racine (Applyzi a son propre `.git` imbriqué).
- **Forkable + pipeline killer-saas pré-câblé** — contrainte structurante de l'angle.

## Success criteria
Parité sur le périmètre + l'angle, mesurable :
- **Fork/init** : une commande `init` scaffolde un nouveau SaaS qui **build et démarre** sans erreur.
- **Re-theme** : changer la palette = **1 fichier de tokens**, tout l'UI suit (validé par `check-design-tokens`).
- **Auth** : signup / login / logout fonctionnels — test vert.
- **Rôle** : un compte `admin` accède à une zone que `user` ne voit pas — test vert.
- **Stripe** : checkout → abonnement actif → webhook met à jour le statut — test vert.
- **Landing** : hero + pricing branché Stripe + CTA rendus.
- **i18n** : fr/en fonctionnels.
- **Méthodo** : le pipeline killer-saas est présent dans le fork (docs/, commands, AGENTS.md) et `/ks-status` tourne.
- **Propreté** : zéro dépendance Applyzi-spécifique restante (Typst/apify/pdf-parse/mammoth retirés).
