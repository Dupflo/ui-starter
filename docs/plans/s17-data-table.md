---
validated: yes
---

# Plan — Story s17-data-table

Branch: `feature/s17-data-table`
Story: `docs/stories.md` → s17-data-table. Les critères d'acceptation font foi ; ce plan ne les répète pas.

## Target

Un `DataTable` (tri, pagination, états) et un bloc « Utilisateurs » composé dessus. Complexité **4**.
Périmètre arrêté par décision humaine du 01/09/2026 : **la sélection de lignes est hors périmètre.**
Ce n'est pas un oubli — c'est ce qui distingue une story livrable d'un chantier de trois.

## Tasks

- [x] **T1 — le typage d'abord.** Définir `Column<Row>` et l'API avant tout rendu. Référencer une clé
      absente de `Row` doit être une **erreur de compilation**, pas un `undefined` silencieux.
      _Vérification_: écrire un cas volontairement faux, constater que `typecheck` échoue, le retirer.
      C'est la tâche qui décide si la table est utilisable ou si elle deviendra une source de bugs.

- [x] **T2 — rendu de base.** `<table>` sémantique : `<thead>`/`<tbody>`, `scope` sur les en-têtes,
      un nom accessible (`<caption>` ou `aria-label`). **Une table sans nom accessible est un défaut** —
      s14 a livré un combobox dont le nom venait du placeholder, donc sans nom dès que le placeholder
      était absent. Ne pas refaire ça une story plus tard.

- [x] **T3 — tri.** Clic sur l'en-tête, indication visuelle du sens, `aria-sort` sur la colonne
      active, et l'en-tête triable doit être un contrôle **actionnable au clavier** (un `<th>` avec un
      `onClick` n'en est pas un).
      _Vérification_: piloter un navigateur, trier, lire `aria-sort` et l'ordre réel des lignes.

- [x] **T4 — pagination.** Page courante, total, navigation. Utilisable au clavier. Décider ce qui se
      passe quand le tri change de page et le dire.

- [x] **T5 — états vide et chargement**, distincts et explicites. L'état vide doit rester une table
      valide (un `role="listbox"` invalide a été trouvé en s14 : même vigilance ici).

- [x] **T6 — rendu de cellule personnalisable**, pour composer un `Badge`, un avatar ou un `Button`
      sans que `DataTable` connaisse ces composants. C'est ce qui évite d'en faire un composant à tout
      faire.

- [x] **T7 — bloc « Utilisateurs »** dans la galerie : une **composition** sur `DataTable`, pas un
      second composant. Avatar, nom, rôle, statut, actions.

- [x] **T8 — responsive.** Trancher explicitement (défilement horizontal ou adaptation) et le dire.

- [x] **T9 — galerie, design system, i18n.** Enregistrer le composant ; le test d'atteignabilité doit
      le couvrir **sans modification** — s'il faut le modifier, c'est un signal. Section dédiée dans
      `docs/design-system.md` décrivant **ce qui est réellement livré**. Strings fr+en.

## Definition of Done

- 9 tâches cochées, chacune vérifiée par exécution.
- Aucune dépendance ajoutée.
- Gates : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint`.
- `/fr/ui` **404** en build production normal, **200** sous `DEMO_MODE=1`.
- Un seul commit.

## Files touched (prévision)

`components/ui/data-table.tsx` (new) · `components/gallery/*` · `docs/design-system.md` ·
`messages/{fr,en}.json` · tests colocalisés.
