# ADR 005 — Idempotence du webhook Stripe : dédup par `event.id` + upsert convergent par `user_id`

- Status: accepted
- Date: 2026-08-17
- Scope: story s06-stripe-billing

## Context

Stripe **rejoue** les webhooks : il retente tout endpoint qui ne répond pas `2xx`, et le développeur rejoue les events à la main via `stripe listen` / la CLI. Le même `event` peut donc frapper `POST /api/webhooks/stripe` plusieurs fois. L'AC3 de s06 l'exige noir sur blanc : « rejouer l'event ne duplique rien ». `docs/architecture.md` (§ Integration points, Stripe) formule la même contrainte autrement : webhook « **idempotent sur `session.id`** », `metadata` du Checkout = source de vérité, écriture via le client service-role.

Il faut donc **un** mécanisme, choisi et justifié, qui réconcilie les deux formulations (« ne rien dupliquer » côté AC, « idempotent sur `session.id` » côté archi) et tienne face à un rejeu. Le point dur : un rejeu doit être inerte non seulement pour l'**état** (la ligne `subscriptions`) mais aussi, si un jour on ajoute un **effet de bord** au traitement (mail de bienvenue, provisioning, compteur), pour cet effet.

Deux leviers existent, orthogonaux :

- **(A) dédup au niveau `event`** — une table `stripe_events` dont la PK est le `event.id` Stripe (globalement unique). `insert` en tête de handler ; si la PK existe déjà, l'event a déjà été traité → on acquitte sans rejouer. Générique (tout type d'event), donne un journal d'audit, protège les effets de bord.
- **(B) convergence de l'état** — `upsert` de `subscriptions` sur une clé naturelle (`user_id`). Rejouer « subscription active » réécrit la **même** ligne → pas de doublon. C'est déjà le pattern de `ensureProfile` (`upsert onConflict:"id"`). Simple, aucune table en plus, mais ne protège **que** la ligne d'abonnement : un rejeu ré-exécute tout effet de bord non-idempotent, et ce n'est pas un garde générique.

## Decision

On fait **les deux, à coût faible** :

1. **Traiter-une-fois par `event.id` (A)** — première instruction du handler : `insert({ id: event.id })` dans une table `stripe_events` (PK = `event.id`, écrite **uniquement** par le service-role). Sur violation de contrainte d'unicité (`code 23505`), l'event est un rejeu → **retourner `200` immédiatement sans ré-appliquer**. C'est la garantie de rejeu au niveau event, celle qu'AC3 lit strictement (« le même _event_ est prouvablement traité une seule fois ») et qui protège tout effet de bord futur.
2. **Upsert convergent par `user_id` (B)** — la ligne `subscriptions` est écrite en `upsert(..., { onConflict: "user_id" })`. Même si (A) était contourné, la ligne reste **convergente** : un rejeu la réécrit à l'identique, jamais en double. Un abonnement par utilisateur dans cette baseline (graveyard : multi-plans complexes).

Réconciliation avec « idempotent sur `session.id` » (archi) : le `session.id` (et son `metadata.user_id`) reste la **source de vérité de l'identité** — c'est de là qu'on tire le `user_id` à écrire. La **clé de rejeu**, elle, est l'`event.id` (A), strictement plus fort que `session.id` : `checkout.session.completed`, `customer.subscription.updated` et `deleted` sont des events distincts portant des `event.id` distincts mais pouvant référencer le même `session`/`customer` ; dédupliquer sur `event.id` traite correctement chacun, là où dédupliquer sur `session.id` fusionnerait à tort des transitions d'état légitimes (active → canceled). (A) + (B) est donc l'implémentation fidèle _et_ durcie de l'intention de l'archi.

## Considered options

- **(A) seul — table `stripe_events` par `event.id`, sans upsert convergent** — rejeté : garde le rejeu au niveau event, mais si (A) échoue partiellement (insert passé, write raté, retente) la ligne `subscriptions` pourrait diverger ; l'upsert convergent (B) est un filet quasi gratuit qui rend la ligne auto-réparante. (A) seul laisse aussi la porte à un `INSERT` `subscriptions` non-idempotent.
- **(B) seul — upsert `subscriptions` par `user_id`, pas de table d'events** — rejeté malgré sa simplicité (une table, pattern `ensureProfile`). Honnêtement : un pur upsert par `user_id` est **replay-safe pour l'état, pas pour les effets de bord**. Tant qu'on ne fait qu'écrire la ligne, AC3 est satisfait ; mais dès qu'un effet de bord non-idempotent s'ajoute (mail, provisioning, incrément), un rejeu le redéclenche. Pour un webhook de paiement — le point _fiabilité/sécurité_ de la story (risk 4) — se priver du garde générique par économie d'une table (~8 lignes SQL + un type) est un mauvais échange. On refuse de trancher AC3 sur la seule convergence d'état.
- **Dédup sur `session.id` (lecture littérale de l'archi)** — rejeté comme _clé de rejeu_ : `session.id` n'existe pas sur les events `customer.subscription.*` (qui portent un `subscription`/`customer`, pas un `session`), et il fusionnerait des transitions d'état distinctes du même abonnement. `session.id`/`metadata.user_id` sont conservés comme **source d'identité**, pas comme clé d'idempotence.
- **Clé d'idempotence en mémoire / cache** — rejeté : non durable, perdu au redéploiement, faux en multi-instance. La dédup doit vivre en base.

## Consequences

- **Plus facile** : rejeu réellement sûr au niveau event (AC3 au sens strict) ; journal d'audit des events reçus (`stripe_events`) ; effets de bord futurs protégés sans retoucher l'architecture d'idempotence ; ligne `subscriptions` auto-convergente.
- **Plus dur** : **deux** objets à créer dans `0003_subscriptions.sql` (`subscriptions` + `stripe_events`) et **deux** types à maintenir à la main dans `database.types.ts` (pas de gen script — ADR 003) ; le handler doit gérer le cas « insert `event.id` en violation d'unicité → `200` early-return » proprement (distinguer `23505` d'une vraie erreur DB).
- **À surveiller** :
  - Les **deux** tables sont **service-role only** — RLS activée, aucune policy d'écriture pour `authenticated`. Un user qui pourrait écrire `subscriptions.status='active'` casserait AC4 (CRITICAL). Miroir du durcissement s05 (`0002_role.sql`).
  - `stripe_events` grossit sans fin ; acceptable pour un starter. Purge/TTL = décision produit ultérieure, hors périmètre (ne pas bricoler un cron ici).
  - Le rejeu réel (`stripe listen`, event replay) n'est **pas testable dans cet env** (pas de Stripe/DB live) : couvert en test unitaire par un double appel du handler sur le même `event.id` (le second n'écrit rien), et porté en « Not verified » pour le bout-en-bout.
