---
validated: yes
reconstructed: true
---

# Plan — Story s16-gallery-fixes

> **Écrit après coup.** Le coordinateur a lancé l'implémentation sans plan, en violation
> d'AGENTS.md (« aucun code n'est écrit avant qu'une story ait un plan validé »). Ce document
> reconstitue les tâches telles qu'elles ont été réellement exécutées, pour que la trace de revue
> soit complète — il ne prétend pas avoir précédé le code. La validation humaine préalable, elle,
> n'a pas eu lieu et n'est pas rattrapable : c'est le coût réel de l'omission.

Branch: `feature/s16-gallery-fixes`
Story: `docs/stories.md` → s16-gallery-fixes.

## Tasks (telles qu'exécutées)

- [x] **T1 — diagnostiquer la carte tarifaire sur la page tournante**, avant toute modification, et
      établir s'il s'agit d'une régression de s15 ou d'un défaut antérieur.
      _Résultat_ : défaut **antérieur**. Mesuré au DOM (bords de `SectionLabel` et `Badge` au même x,
      écart nul), expliqué par le CSS compilé (Tailwind v4 rend `space-y-*` en `margin-block-end`,
      vertical uniquement, donc sans effet entre deux `inline-flex` de la même ligne), puis confirmé en
      extrayant `f53ce0e` (pré-s15) dans un worktree : même écart nul. L'hypothèse « régression s15 » du
      coordinateur était fausse.

- [x] **T2 — corriger dans le `Snippet`**, jamais dans un `render` : s12 a fermé un major où la mise
      en page ne vivait que dans `render`, si bien que le code copiable omettait ce que l'aperçu montrait.
      _Résultat_ : conteneur `div` (`flex flex-wrap items-center gap-3`) dans l'arbre du snippet ; le
      `<pre>` servi le montre. `escape-hatch.test.ts` reste à 5.

- [x] **T3 — bouton `size="icon"`** : afficher une vraie icône au lieu du mot « icon ».
      _Résultat_ : SVG 16×16 au trait, conforme à la convention `NavIcon` d'`app-sidebar.tsx`, avec un
      nom accessible réel (vérifié dans l'arbre d'accessibilité, pas seulement l'attribut).

- [x] **T4 — préserver la dérivation** : la liste des tailles vient de la table exportée par le
      primitive ; une taille ajoutée doit apparaître sans toucher la galerie.
      _Résultat_ : prouvé par sonde, deux fois et avec des formes différentes (dont `iconLarge`, choisi
      pour sa collision de sous-chaîne avec `icon` — il n'a reçu ni l'icône ni l'`aria-label`, la
      comparaison étant stricte).

## Definition of Done

- Gates verts : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint`.
- Compte de blocs de code inchangé (24), vérifié par requête DOM.
- `/fr/ui` 404 en build production normal, 200 sous `DEMO_MODE=1`.
- Un seul commit.

## Findings de revue traités (`docs/reviews/s16-gallery-fixes.md`, major, ship allowed: yes)

- [x] **Major 1 — `button-icon-example.test.ts` ne pinne pas l'icône à la branche qui la rend.** La
      neutralisation de la revue (`children: size === "icon" ? "icon" : size,` dans
      `primitives-section.tsx`, en laissant `BUTTON_ICON_SIZE_EXAMPLE` défini mais inutilisé) laissait
      les 6 tests verts. _Résultat_ : nouvelle assertion qui matche le texte exact de la branche
      ternaire (`children: size === "icon" ? BUTTON_ICON_SIZE_EXAMPLE : size,`), plus les vérifications
      "svg"/`viewBox`/stroke déplacées de « quelque part dans le fichier » vers le bloc de définition de
      la constante elle-même. Preuve : mutation exacte de la revue appliquée → 1 test rouge sur 6 ; code
      restauré → 6/6 verts à nouveau.
- [x] **Minor 2 — la branche icône est keyed sur le littéral `"icon"`.** Renommer la clé dans
      `button.tsx` (`icon` → `square`) garderait la ligne dérivée (elle apparaît toujours, `Object.keys`
      reste générique) mais perdrait l'icône silencieusement, `Object.keys(buttonSizes)` typant en
      `string[]`. Sous la barre des AC (qui exige seulement qu'une taille _nouvelle_ apparaisse sans y
      toucher) : pas de lien type-level ajouté (aucun moyen sûr sans cast non typé) — le commentaire
      d'en-tête du test est corrigé pour dire précisément ce qui tient (la liste, pas l'icône).
- [x] **Minor 3 — assertion `blocks-section-pricing-gap.test.ts` trop large.** L'ancienne assertion
      regexait tout le bloc pricing pour `space-y-3`, donc passerait même si c'est le `div` wrapper qui
      la portait plutôt que la `Card`. _Résultat_ : assertion resserrée à la tranche de props propre à la
      `Card` (entre `component: "Card"` et son `children: [`). Preuve : simulation locale (classe
      déplacée sur le wrapper) → rouge ; code restauré → vert.
