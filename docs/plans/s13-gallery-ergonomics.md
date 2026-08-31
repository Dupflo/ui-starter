---
validated: yes
---

# Plan — Story s13-gallery-ergonomics

Branch: `feature/s13-gallery-ergonomics`
Story: `docs/stories.md` → s13-gallery-ergonomics. Read it; this plan does not repeat the criteria.

## Target

La galerie est correcte mais illisible : tout le code de tous les items est déplié en permanence, et
les modales — dont on dispose — ne sont pas réellement démontrables. Complexité **2**.

## Tasks

- [x] **T1 — conteneur repliable.** Un composant client minimal enveloppant chaque bloc de code, replié
      par défaut, déplié par un bouton « Voir le code ». État **par item**. Composer `Button` ; si le design
      system ne couvre pas le besoin, le signaler comme gap, ne pas improviser.
      _Vérification_: le corps de la galerie reste un Server Component — seul le conteneur est client.

- [x] **T2 — préserver la garantie de s12.** s12 exige que chaque item expose son JSX, et un test compte
      les blocs de code dans le HTML servi. Le repli ne doit pas les faire disparaître du DOM (sinon la
      garantie devient fausse) ni les rendre inatteignables.
      _Vérification_: le comptage des blocs de code reste à 54 sur le HTML servi. Si le repli les retire du
      DOM, **dire pourquoi c'est acceptable et adapter le test consciemment**, ne pas le laisser mentir.

- [x] **T3 — décider du bouton copier.** Visible replié, ou seulement déplié ? Trancher, implémenter,
      justifier en une phrase dans le rapport. Copier sans avoir lu est un cas d'usage réel.

- [x] **T4 — modales démontrables.** Un déclencheur ouvrable **par taille**, la liste venant de la table
      `sizes` exportée par `components/ui/modal.tsx` — jamais recopiée. Remplace l'unique bouton actuel et
      la liste de tailles affichée en texte.
      _Vérification_: ajouter une taille à la table du primitive la fait apparaître sans toucher la galerie.

- [x] **T5 — Lightbox.** Même traitement si sa surface le permet ; sinon dire précisément pourquoi et
      ce qui est montré à la place.

- [x] **T6 — le garde-fou des échappatoires.** `escape-hatch.test.ts` épingle le total à 5 et exige un
      commentaire de justification. Les nouveaux déclencheurs peuvent en créer : les justifier et **bumper
      le compteur délibérément**. Ne jamais contourner le garde-fou — il vient d'être réparé deux fois.

- [x] **T7 — i18n + thèmes.** Nouvelles strings fr+en (`messages/coverage.test.ts` impose la parité).
      Zéro couleur brute. Vérifier le rendu en clair et en sombre.

## Definition of Done

- 7 tâches cochées, chacune vérifiée.
- Gates : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint` (4 warnings hérités tolérés).
- `/fr/ui` toujours **404** en build production normal, **200** sous `DEMO_MODE=1`.
- Un seul commit.

## Files touched (prévision)

`components/gallery/*` · `messages/{fr,en}.json` · tests colocalisés.
