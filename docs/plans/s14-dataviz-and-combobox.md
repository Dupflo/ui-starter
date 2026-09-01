---
validated: yes
---

# Plan — Story s14-dataviz-and-combobox

Branch: `feature/s14-dataviz-and-combobox`
Research: `docs/research/s14-dataviz-and-combobox.md` — read it first, especially the corrected
dependency measurement and the three traps. ADR: `docs/decisions/006-charting-library.md`.

## Target

Ajouter au design system un **combobox** et des **composants de graphique**. Complexité **4**.
Deux surfaces neuves et indépendantes ; la difficulté n'est pas de les faire marcher, c'est
l'accessibilité clavier pour l'un et le respect des tokens pour l'autre.

## Decisions already taken — do not relitigate

- **Recharts 3** (ADR 006), pris en connaissance de cause : Redux Toolkit entre dans l'arbre.
  Décision humaine du 01/09/2026 avec les chiffres en main.
- **Encapsulation obligatoire** dans `components/ui/chart-*.tsx`. Aucun écran, aucune page, aucun
  fichier de galerie n'importe `recharts` directement. C'est ce qui rend l'ADR réversible.
- **Aucune dépendance pour le combobox** — il s'écrit à la main (un ajout exigerait un nouvel ADR).

## Tasks

- [x] **T1 — installer Recharts et MESURER.** `npm i recharts`. Puis mesurer le delta réel sur le
      bundle client émis : taille des chunks avant/après, avec un graphique effectivement rendu.
      _Vérification_: chiffres réels inscrits dans le rapport ET dans la story. Ne jamais citer les
      7,45 Mo `unpackedSize` comme un coût de bundle — c'est la taille du tarball publié.
      **Mesuré** (`.next/diagnostics/route-bundle-stats.json`, route `/[locale]/ui`, avec les 3
      graphiques réellement rendus) : First Load JS non compressé 869 915 B → 1 303 539 B, **+433 624 B
      (+423,5 KiB)** ; gzip 246 770 B → 370 010 B, **+123 240 B (+120,4 KiB)**. Les autres routes ne
      bougent que de +28 à +30 B (les nouvelles clés i18n) — le code-splitting par route isole bien
      Recharts/Redux à `/ui` uniquement.

- [x] **T2 — les wrappers de graphique.** `components/ui/chart-line.tsx`, `chart-bar.tsx`,
      `chart-donut.tsx`. Client Components. API étroite et propre à ce projet — ne pas ré-exposer
      l'API Recharts « au cas où ».
      _Vérification_: `git grep -l "from \"recharts\"" -- app components | grep -v "components/ui/chart-"`
      doit être **vide**. En faire un test.
      **Fait** : `components/ui/chart-encapsulation.test.ts` (filesystem walk équivalent, indépendant de
      git) — prouvé rouge avec un import factice puis vert après suppression (voir le rapport).
      **Revue (fix)** : le regex ne couvrait que `from "recharts"` — élargi pour couvrir les imports en
      sous-chemin (`from "recharts/es6/…"`), `require("recharts")` et `import("recharts")` (dynamique,
      idiome `next/dynamic`) ; `lib` ajouté à `ROOTS` (absent). Les 4 formes prouvées rouges
      individuellement avec un fichier jetable, puis vertes après suppression.

- [x] **T3 — couleurs par les tokens.** Chaque série reçoit sa couleur explicitement via
      `var(--color-…)`. **Le piège** : Recharts applique ses propres couleurs par défaut (`#8884d8`…)
      dès qu'aucun `fill`/`stroke` n'est passé, et `check-design-tokens` ne les voit pas (il ne parcourt
      que `app|components|lib`). Un graphique non coloré rendra donc hors palette avec un build vert.
      _Vérification_: rendre un graphique, lire le SVG servi, prouver qu'aucune couleur par défaut de
      Recharts n'y apparaît. Sur le rendu, pas sur le lint.
      **Fait** : `components/ui/chart-tokens.test.ts` (garde source) + preuve sur le DOM réellement
      servi (Chrome headless réel, hydraté) — voir le rapport pour le détail des `fill=`/`stroke=`
      observés, tous `var(--color-…)`, zéro hex Recharts.

- [x] **T4 — mode sombre.** Les graphiques doivent suivre la bascule de thème. Une couleur lue une
      seule fois au montage ne suivra pas ; `var(--color-…)` passé directement, si.
      _Vérification_: basculer le thème avec un graphique à l'écran et constater. Si ce n'est pas
      vérifiable sans navigateur, le dire et le lister en « non vérifié ».
      **Vérifié pour de vrai** : Chrome headless piloté via CDP, clic réel sur le bouton « Mode sombre »
      de la galerie, DOM re-lu avant/après — voir le rapport (attribut `stroke` inchangé
      `var(--color-lime)`, couleur de grille recalculée `#e2e2e8`→`#2a2d40`).

- [x] **T5 — le combobox.** `components/ui/combobox.tsx` : saisie libre, liste filtrée, sélection
      souris et clavier, état vide, état désactivé.
      **L'accessibilité est une exigence, pas un raffinement** : `role="combobox"`, `aria-expanded`,
      `aria-controls`, `aria-activedescendant`, popup `role="listbox"` avec des `role="option"`, gestion
      de ↑ ↓ Entrée Échap Début Fin, focus conservé dans le champ, et un compte de résultats en
      `aria-live`. Un combobox utilisable seulement à la souris est un défaut à signaler, pas à livrer.
      _Vérification_: lire le DOM servi et prouver les rôles et attributs. Ce que Vitest ne peut pas
      prouver ici (interaction clavier réelle) va en « non vérifié », explicitement.
      **Fait** : `components/ui/combobox.test.ts` (garde source) + DOM réellement servi (Chrome headless
      hydraté) montrant `role`, `aria-*`, `role="option"` et l'annonce `aria-live` — voir le rapport.
      Interaction clavier réelle listée en « non vérifié ».
      **Revue (fix, majeur)** : le champ n'avait **aucun nom accessible** — le label était un `<span>`
      nu, jamais associé au champ (ni `htmlFor`, ni `aria-labelledby`, ni `aria-label` sur le contrôle),
      donc un lecteur d'écran retombait sur le `placeholder` optionnel (confirmé via
      `Accessibility.getPartialAXTree` sur le DOM hydraté : nom résolu depuis `"type":"placeholder"`).
      Corrigé avec un vrai `<label htmlFor={inputId}>`. Le popup vide utilisait aussi un `<div
  role="listbox">` avec un enfant texte libre (structure invalide — un listbox n'a que des
      `option`/`group` comme enfants valides) et perdait l'`aria-label` de l'état peuplé — unifié en un
      seul `<ul role="listbox" aria-label={label}>` dont l'état vide rend un `role="option"
  aria-disabled`.

- [x] **T6 — galerie.** Enregistrer les nouveaux composants. Le test « une primitive ne peut pas
      manquer en silence » doit les couvrir **sans modification** — s'il faut le modifier, c'est un
      signal, pas une formalité.
      **Rappel s13** : tout export d'un module `"use client"` devient opaque côté serveur. Si la galerie
      énumère quoi que ce soit exporté par les nouveaux composants, ça se fait dans la frontière client.
      `escape-hatch.test.ts` épingle le compteur à 5 : le bumper délibérément avec justification si
      nécessaire, jamais le contourner.
      **Fait** : `components-map.ts` enregistre `ChartLine`/`ChartBar`/`ChartDonut`/`Combobox` ;
      `components-map.test.ts` passe sans modification. Aucune énumération d'export requise (props
      scalaires/tableaux, pas de table `variants`/`sizes`) — le piège s13 ne s'applique donc pas ici.
      Compteur `escape-hatch.test.ts` inchangé à 5 : aucun `render:` nécessaire (les deux nouvelles
      familles se rendent entièrement via `renderSnippet`).

- [x] **T7 — design system + i18n.** `docs/design-system.md` gagne ses sections « Combobox » et
      « Data viz » décrivant **ce qui est réellement livré**. Strings fr+en. Zéro couleur brute.

## Definition of Done

- 7 tâches cochées, chacune vérifiée par exécution.
- Le delta de bundle mesuré et inscrit.
- `git grep` prouvant qu'aucun import direct de `recharts` ne fuit hors des wrappers.
- Gates : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint`.
- `/fr/ui` toujours **404** en build production normal, **200** sous `DEMO_MODE=1`.
- Un seul commit.

## Files touched (prévision)

`components/ui/{chart-line,chart-bar,chart-donut,combobox}.tsx` (new) · `components/gallery/*` ·
`docs/design-system.md` · `messages/{fr,en}.json` · `package.json` · tests colocalisés.
