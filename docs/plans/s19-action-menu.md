---
validated: yes
---

# Plan — Story s19-action-menu

Branch: `feature/s19-action-menu`
Story: `docs/stories.md` → s19-action-menu. Les critères font foi ; ce plan ne les répète pas.

## Target

Un menu d'actions déclenché par un bouton discret, intégré dans la colonne « Actions » du `DataTable`.
Complexité **3**. La difficulté n'est pas d'ouvrir une liste — c'est le clavier, le focus, et le fait
qu'un menu dans une cellule de tableau doit échapper au `overflow-x-auto` du conteneur.

## Tasks

- [x] **T1 — lire le précédent avant d'écrire.** `components/ui/locale-menu.tsx` fait déjà un
      dropdown : `useState`, `aria-expanded`, `role="menu"`, fermeture au clic extérieur. Le lire pour en
      reprendre ce qui vaut — mais il est couplé à la locale, donc ne pas le généraliser à la hache.
      _Rapporter_ ce qui a été repris et ce qui ne l'a pas été, et pourquoi.

- [x] **T2 — la primitive.** `components/ui/action-menu.tsx` : un déclencheur discret ouvre une liste
      d'actions plates. Une action peut être **destructive** (rendu distinct) et **désactivée**.
      Périmètre : pas de sous-menus, pas de raccourcis affichés, pas de groupes séparés.

- [x] **T3 — l'accessibilité, qui est le cœur de la story.** Nom accessible réel sur le déclencheur,
      `aria-expanded`, `aria-haspopup` ; rôle correct sur la liste et sur ses éléments ; ↑ ↓ Début Fin ;
      Entrée/Espace ; Échap **et** clic extérieur pour fermer ; **le focus revient au déclencheur** à la
      fermeture.
      _Vérification_: dans l'**arbre d'accessibilité** et en pilotant un navigateur. s14 a livré un
      contrôle dont le nom venait d'un placeholder optionnel — la présence d'un attribut ne prouve rien.

- [x] **T4 — le piège du tableau.** Le conteneur de table a `overflow-x-auto` (s17). Un menu ouvert
      dans une cellule doit se superposer **sans être rogné**.
      _Vérification_: ouvrir le menu de la dernière ligne sur la table réelle et constater. C'est le
      défaut classique de ce motif, et il ne se voit qu'au rendu.

- [x] **T5 — intégration.** Remplacer le bouton « Voir » isolé dans la colonne Actions de la démo.
      **Trap** : les fonctions ne traversent pas la frontière Server→Client (défaut trouvé en s17 avec
      `rowKey`). Les gestionnaires doivent vivre dans un module client.

- [x] **T6 — galerie, design system, i18n.** Enregistré ; le test d'atteignabilité le couvre **sans
      modification**. Section dans `docs/design-system.md` décrivant ce qui est réellement livré. Strings
      fr+en. Clair et sombre.

## Definition of Done

- 6 tâches cochées, chacune vérifiée par exécution.
- Aucune dépendance ajoutée.
- Gates : `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint` (0 erreur, les 4
  warnings hérités).
- `/fr/ui` **404** en build production normal, **200** sous `DEMO_MODE=1`.
- Un seul commit.

## Files touched (prévision)

`components/ui/action-menu.tsx` (new) · `components/gallery/*` · `docs/design-system.md` ·
`messages/{fr,en}.json` · tests colocalisés.
