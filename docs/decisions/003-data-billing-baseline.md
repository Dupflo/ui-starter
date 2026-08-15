# ADR 003 — Baseline data & billing : abonnement seul, migration initiale propre

- Status: accepted
- Date: 2026-08-15
- Scope: framing

## Context
Applyzi porte ~35 migrations Supabase entrelacées de schéma CV (`profiles_*`, `cv_*`, `applications`, `cover_letters*`) et d'un modèle de crédits (`credit_ledger`/`credit_transactions`/`user_credits` + RPC reserve/confirm). Le PRD de ui-starter veut un billing **par abonnement** (story s06), pas de crédits, et un starter neutre. Copier le dossier de migrations tel quel traînerait tout le domaine.

## Decision
Le baseline data du starter est **une migration initiale propre**, réécrite (pas copiée), avec seulement :
- **`profiles`** (identité, `role` `user`/`admin` défaut `user`),
- **`subscriptions`** (`user_id`, `stripe_customer_id`, `status`, `plan`), alimentée par le webhook Stripe.

Billing = **abonnements Stripe uniquement**. Le modèle credit-ledger et tout le schéma CV sont **écartés du baseline** (conservés comme référence de pattern, pas dans le starter).

## Considered options
- **Copier les migrations d'Applyzi puis supprimer les tables CV** — rejeté : historique sale, tables mortes, RLS/contraintes à démêler ; risque d'incohérences.
- **Garder le modèle de crédits en plus des abonnements** — rejeté : non demandé par le PRD, complexité (RPC atomiques, idempotence) sans valeur pour un starter générique. Reste extractible plus tard si un SaaS forké en a besoin.
- **Pas de table `subscriptions`, statut Stripe lu à la volée** — rejeté : le PRD exige que « l'app connaît mon statut d'abonnement » de façon fiable ; un webhook idempotent + table locale est la voie éprouvée d'Applyzi.

## Consequences
- **Plus facile** : schéma minimal, lisible, sans domaine mort ; chaque SaaS forké part propre.
- **Plus dur** : réécrire la migration initiale à la main (ne pas réutiliser le dossier) ; regénérer `database.types.ts` sur ce schéma réduit.
- **À surveiller** : si un futur SaaS a besoin de crédits, réintroduire le pattern port/adapter + RPC `SECURITY DEFINER` (cf. ADR 004), ne pas bricoler.
