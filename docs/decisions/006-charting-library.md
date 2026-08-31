# ADR 006 — Bibliothèque de graphiques : Recharts

- Status: accepted
- Date: 2026-08-31
- Scope: story s14-dataviz-and-combobox

## Contexte

La galerie de composants (s12) a révélé une absence : le starter n'a aucune primitive de
visualisation de données, alors qu'un dashboard de SaaS en affiche presque toujours. `StatCard`
donne un chiffre, pas une évolution.

AGENTS.md impose un ADR pour toute déviation de la stack imposée, et le design system interdit
d'inventer un composant hors système. Ajouter des graphiques est donc une décision structurelle,
pas une tâche d'implémentation.

Contrainte propre à ce repo : `scripts/check-design-tokens.mjs` casse le build sur toute couleur
brute dans `app|components|lib`. Or les bibliothèques de graphes prennent leurs couleurs en props
(`fill="#..."`). Toute solution retenue doit passer par les tokens.

## Options considérées

### A — SVG maison, sans dépendance

Écrire sparkline / barres / ligne / donut en SVG dans `components/ui/`.

- **Pour** : zéro dépendance, zéro poids, tokens natifs, le re-theme suit automatiquement.
- **Contre** : pas de tooltip, pas de légende, pas d'axes calculés, pas de responsive réel. Chaque
  besoin nouveau (empilé, bi-axes, zoom) est du code à écrire. Un starter qui fournit des graphes
  trop pauvres pousse le forkeur à installer une bibliothèque de toute façon — et à jeter le nôtre.
- **Rejeté** : le coût se paie plus tard, chez chaque forkeur, et en double.

### B — Recharts (retenu)

- **Pour** : standard de fait en React, API déclarative composable, tooltips / légendes / axes /
  responsive fournis. La 3.10 déclare React 19 en peer dependency (vérifié :
  `react: ^16.8 || ^17 || ^18 || ^19`), donc compatible avec la stack sans forçage.
- **Contre** : dépendance lourde (Recharts + d3-scale/shape/array). Poids réel à mesurer à
  l'implémentation et à documenter — l'estimation initiale (~500 Ko) n'engage rien tant qu'elle
  n'est pas mesurée sur le bundle émis.
- **Contre** : rendu client uniquement — les graphes seront des Client Components, à isoler pour ne
  pas contaminer l'arbre serveur.

### C — Reporter la décision

- **Pour** : un composant de graphe conçu sans cas d'usage réel vieillit mal.
- **Rejeté** : le besoin est déjà là (dashboard), et l'absence bloque la galerie.

## Décision

**Recharts**, encapsulé derrière des composants `components/ui/chart-*.tsx` maison.

L'encapsulation n'est pas cosmétique : elle est ce qui rend la décision réversible. Aucun écran
n'importe Recharts directement ; si la bibliothèque doit être remplacée, la surface à réécrire est
`components/ui/chart-*`, pas l'application.

## Conséquences

- Les couleurs des graphes viennent des tokens via `var(--color-…)`, jamais d'un hex littéral.
  **Attention à ne pas se croire protégé** : `check-design-tokens` ne parcourt que `app`,
  `components` et `lib`. Il attrape un hex qu'un développeur tape, rien d'autre. Or **Recharts
  embarque ses propres couleurs de série par défaut** (`#8884d8` et consorts), appliquées dès qu'on
  ne passe pas de `fill`/`stroke`. Un graphe sans couleur explicite rendra donc hors palette **avec
  un build parfaitement vert**, et ces défauts étant internes à la bibliothèque, ils ne suivront pas
  non plus la bascule `.dark`. C'est le mode d'échec réaliste de s14 : chaque série doit recevoir sa
  couleur explicitement, et cela doit être vérifié sur le rendu, pas sur le lint.
- Les composants de graphe sont des Client Components ; les pages restent serveur.
- Le poids ajouté au bundle doit être **mesuré** et inscrit dans la story qui l'implémente, pas
  estimé.
- `docs/design-system.md` gagne une section « Data viz » décrivant les composants réellement livrés.
- Si un jour aucun graphe n'est utilisé par un fork, la dépendance reste dans son `package.json` :
  c'est le coût assumé d'un starter généraliste.

## Supersedes

Aucun.
