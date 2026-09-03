---
validated: yes
---

# Plan — Story s18-ui-kit-polish

Branch: `feature/s18-ui-kit-polish`
Story: `docs/stories.md` → s18-ui-kit-polish. Les critères font foi ; ce plan ne les répète pas.

## Target

Trois retours de recette : renommer la galerie en « UI Kit », rendre utile la démonstration de `pad`,
et enrichir la table (colonnes + avatars). Complexité **3**.

## Decision already taken — do not relitigate

**Décision humaine du 03/09/2026** : les images d'avatar de démonstration sont des **SVG inline
(data-URI) construits sur les tokens**. Aucun fichier ajouté à `public/`. Raison : tout fichier y
part dans chaque fork, alors que la galerie n'existe qu'en dev et en démo — le même arbitrage que
pour les polices en s10, où des binaires avaient été committés puis retirés.

## Tasks

- [x] **T1 — renommage.** « Galerie de composants » → « UI Kit », fr et en. Chercher **toutes** les
      occurrences (nav, titre de page, métadonnées, `docs/`) — un renommage à moitié fait est pire que
      pas de renommage.
      _Vérification_: `git grep -i "galerie de composants"` et son équivalent anglais ne renvoient plus
      que ce qui doit rester.

- [x] **T2 — la démonstration de `pad`.** Aujourd'hui trois cartes empilées au contenu identique :
      l'écart de padding est invisible et la répétition n'apprend rien. **Trancher** entre rendre la
      comparaison lisible (côte à côte) ou retirer la démonstration et documenter `pad` dans le tableau
      de props. Justifier le choix en une phrase.

- [x] **T3 — `Avatar`.** Primitive dans `components/ui/` : `src` → image, sinon initiales. Périmètre
      strict : rien d'autre (pas de badge de présence, pas de groupe empilé).
      _Vérification_: nom accessible réel lu dans l'**arbre d'accessibilité** ; un avatar purement
      décoratif doit être `aria-hidden`, un avatar porteur d'information doit avoir un nom.

- [x] **T4 — images de démonstration en data-URI SVG**, couleurs dérivées des tokens.
      _Vérification_: **sur le rendu**, pas sur le lint — `check-design-tokens` ne parcourt que
      `app|components|lib` et ne verra jamais une couleur en dur dans une chaîne encodée. C'est
      exactement le piège des couleurs par défaut de Recharts en s14.

- [x] **T5 — enrichir la table.** Assez de colonnes pour que le tri sur plusieurs types (texte,
      nombre, date, statut) se voie réellement, plus la colonne avatar. Le typage `keyof Row` doit
      tenir sur les nouvelles colonnes.
      _Note (fix review)_ : le défilement horizontal était déjà déclenché à 3 colonnes en mobile
      (373px vs wrapper 290px) — les colonnes ajoutées l'élargissent, elles ne le rendent pas
      démonstrable pour la première fois ; corrigé dans `docs/design-system.md` et le header du test.
      _Note (fix review, `keyof Row`)_ : dans `data-table-users-demo.tsx` (JSX typé
      `Column<UserRow>[]`), l'invariant tient nativement. Dans `primitives-section.tsx`, les
      colonnes traversent `Snippet["props"]` (`{ value: unknown }`, snippet.ts) qui efface le
      générique — une clé invalide y compilait silencieusement. Fermé sans déplacer le littéral (les
      guards source-level de `data-table-demo-columns.test.ts` le lisent tel quel) : le littéral
      `value: [...]` porte désormais `satisfies Column<DataTableDemoRow>[]`, qui fait échouer
      `npm run typecheck` sur une clé erronée sans changer la valeur ni son emplacement — preuve
      manuelle faite (clé fautive → `tsc` échoue → retirée).

- [x] **T6 — galerie, i18n, thèmes.** `Avatar` enregistré ; le test d'atteignabilité le couvre
      **sans modification** (s'il faut le modifier, c'est un signal). Strings fr+en. Clair et sombre.

## Definition of Done

- 6 tâches cochées, chacune vérifiée par exécution.
- Aucun fichier ajouté à `public/`. Aucune dépendance.
- Gates : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint`.
- `/fr/ui` **404** en build production normal, **200** sous `DEMO_MODE=1`.
- Un seul commit.

## Files touched (prévision)

`components/ui/avatar.tsx` (new) · `components/gallery/*` · `messages/{fr,en}.json` ·
`components/app/app-sidebar.tsx` · `docs/design-system.md` · tests colocalisés.
