# ADR 001 — Boilerplate & stack : fork d'applyzi-flagship

- Status: accepted
- Date: 2026-08-15
- Scope: framing

## Context
ui-starter est un starter SaaS interne (remplacement de ship-saas.now). killer-saas est fait pour se tenir sur un boilerplate : le stack vient de la base, pas de zéro. Le PRD impose déjà « stack = celui d'Applyzi » et « origine = fork d'applyzi-flagship ». Il faut acter formellement d'où vient le code et les conventions.

## Decision
Le boilerplate est **`applyzi-flagship/`** : on le forke, on strippe son domaine (CV/Typst/apify/pdf-parse/mammoth), on garde son infra et ses conventions (Next.js 16 App Router, React 19, TS strict, Supabase `@supabase/ssr`, Stripe, Tailwind v4 `@theme`, next-intl v4, react-hook-form + zod, Vitest).

## Considered options
- **Acheter/setup ship-saas.now (€299–399)** — rejeté : c'est précisément la cible du kill (coût + template externe non maîtrisé). Son stack (Drizzle, Better Auth, Clean Architecture 3-couches) diverge de ce que je possède déjà.
- **Stack par défaut scaffoldé maintenant (create-next-app + shadcn/ui + Drizzle + Better Auth)** — rejeté : jetterait l'UI élégante d'Applyzi (l'angle #1 du PRD) et 80% d'infra déjà écrite et éprouvée. Repartirait sur des conventions neuves à documenter.
- **Repo vierge, conventions actées en ADR** — rejeté : fait perdre le levier principal de la méthode (extraire des conventions d'une base réelle) au lieu de les inventer.

## Consequences
- **Plus facile** : auth/Stripe/tokens/i18n déjà câblés et conformes ; démarrage immédiat ; l'UI Applyzi devient le socle re-thémable (angle PRD).
- **Plus dur** : il faut identifier proprement la frontière strip/keep (fait dans docs/architecture.md §F de l'analyse) et éviter de traîner du code CV mort.
- **À surveiller** : les migrations Supabase d'Applyzi sont entrelacées de schéma CV → ne pas copier le dossier tel quel (voir ADR 003).
