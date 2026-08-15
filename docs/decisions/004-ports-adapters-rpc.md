# ADR 004 — Ports & adapters + RPC `SECURITY DEFINER` pour la logique sensible

- Status: accepted
- Date: 2026-08-15
- Scope: framing

## Context
Le boilerplate impose un pattern hérité : l'infra transverse est définie comme **port (interface) dans `core/domain/`** sans import framework, implémentée dans `adapters/`, et la logique sensible (mutations atomiques, idempotence, contournement RLS) vit dans des **RPC Supabase `SECURITY DEFINER`**, l'adapter ne faisant que mapper snake_case↔camelCase. ui-starter conforme à ce pattern plutôt que d'en inventer un autre.

## Decision
Adopter le pattern **ports & adapters** pour toute capacité transverse à besoins d'infra, et **externaliser la logique serveur sensible en RPC `SECURITY DEFINER`** (appelées via le client service-role, server-only). Les server actions restent l'unique porte de mutation côté app et dérivent l'identité de `getUser()`.

## Considered options
- **Accès Supabase direct depuis les composants/actions, sans port** — rejeté : couple le domaine au framework, rend le code non testable en isolation, et disperse la logique sensible dans l'app (risque RLS/sécurité).
- **Clean Architecture 3-couches stricte de ship-saas.now** — rejeté : cimetière PRD ; plus lourd que le pattern port/adapter déjà en place, sans gain pour un starter.
- **Logique atomique en TypeScript côté serveur (pas de RPC)** — rejeté : perd l'atomicité/idempotence garanties côté DB et impose de gérer les courses applicativement.

## Consequences
- **Plus facile** : domaine testable sans DB (ports mockables) ; sécurité concentrée dans des RPC auditées ; conforme au boilerplate → zéro friction avec le code repris.
- **Plus dur** : une nouvelle capacité sensible = port + adapter + migration RPC (plus de cérémonie qu'un accès direct).
- **À surveiller** : ne pas laisser fuir d'import next/supabase dans `core/` ; garder `import "server-only"` sur les modules service-role/Stripe.
