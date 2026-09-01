# Design System — ui-starter

> **Source de vérité : le bloc `@theme` de `app/globals.css`** (Tailwind v4 CSS-first, pas de `tailwind.config`). Ce document _capture_ ce système pour que `/ks-design` le consomme à chaque story UI — il ne l'invente pas.
> ui-starter est un fork d'`applyzi-flagship` **strippé du domaine CV**. On garde le **chrome de l'app** (tokens `pine` + `lime`, Plus Jakarta Sans / Geist) ; le **registre artefact CV** (serif Fraunces/Newsreader, couleurs de catégories de compétences) est hors périmètre — voir la dernière section.
> **Règle de fer (ADR 002)** : aucune valeur arbitraire de couleur / radius / font-size / tracking / shadow. Toujours une classe de token. Un besoin absent = **ajouter un token dans `@theme`**, jamais un `text-[#hex]` (le guard `check-design-tokens` casse le build au `prebuild`).

## Tokens

### Couleurs — marque

| Token (classe) | Valeur    | Usage                                                                                 |
| -------------- | --------- | ------------------------------------------------------------------------------------- |
| `pine`         | `#1E2132` | Couleur de marque sombre — chrome (sidebar, cartes pine, bandeaux), fond `<body>`     |
| `pine-900`     | `#141725` | Pine plus sombre — hover des surfaces pine                                            |
| `lime`         | `#818CF8` | **Accent fort unique** — CTA principal / état actif. Texte foncé dessus, jamais blanc |
| `ink`          | `#161616` | Texte principal (light)                                                               |

### Couleurs — surfaces & neutres

| Token         | Valeur    | Usage                                                              |
| ------------- | --------- | ------------------------------------------------------------------ |
| `paper`       | `#F9F9FB` | Surface de carte claire · aussi foreground clair sur surfaces pine |
| `sand`        | `#F5F5F8` | Canvas / fond d'espace de travail                                  |
| `line`        | `#E2E2E8` | Filets / bordures                                                  |
| `line-strong` | `#D6D6DE` | Séparateur / bordure plus marquée                                  |
| `muted`       | `#5C5C6B` | Texte secondaire                                                   |
| `muted-ink`   | `#6B6B7A` | Texte secondaire neutre (gris)                                     |
| `muted-soft`  | `#9A9AAA` | Texte tertiaire très discret                                       |
| `fill`        | `#F4F4F8` | Remplissage pâle (inputs, segmented, placeholders)                 |
| `fill-mute`   | `#ECECF2` | Remplissage atténué / hairline                                     |
| `input`       | `#FFFFFF` | Fond des contrôles de formulaire (blanc en light)                  |

### Couleurs — sémantiques

| Token                            | Valeur                | Usage                                                   |
| -------------------------------- | --------------------- | ------------------------------------------------------- |
| `ink-strong`                     | `#0F1117`             | Titres de l'app                                         |
| `link`                           | `#4F46E5`             | Liens texte accent inline                               |
| `success`                        | `#1F8A4C`             | Positif / envoyé / tendance ↑                           |
| `success-soft`                   | `#E4F4EA`             | Fond pâle de succès                                     |
| `danger`                         | `#C5402E`             | Destructif / erreurs                                    |
| `warning`                        | `#C9810A`             | Avertissement / non connecté                            |
| `warning-soft`                   | `#F7EDDB`             | Fond pâle d'avertissement                               |
| `on-pine`                        | `#A5B4FC`             | Texte atténué sur surface pine                          |
| `on-pine-bright`                 | `#C7D2FE`             | Texte plus clair sur surface pine                       |
| `cat-sector` / `cat-sector-soft` | `#1F4E8C` / `#EEF2FB` | Couleur du badge `info` (seule paire `cat-*` conservée) |

### Typographie

| Token (classe) | Police                          | Usage                                                       |
| -------------- | ------------------------------- | ----------------------------------------------------------- |
| `font-display` | Plus Jakarta Sans (500/600/700) | Titres (`Title`)                                            |
| `font-ui`      | Geist                           | Corps de texte, UI, boutons (police par défaut du `<body>`) |
| `font-mono`    | Geist Mono                      | Labels mono en capitales trackées (`SectionLabel`)          |

**Échelle de texte** : l'échelle Tailwind par défaut (`text-xs … text-6xl`) **plus** `text-2xs` (`0.625rem` / 10px) ajouté au petit bout pour les micro-labels UI.

### Spacing / radius / tracking / élévation

- **Spacing** : échelle Tailwind par défaut (pas de tokens custom).
- **Radius** : échelle Tailwind (`rounded-sm … rounded-2xl`) + token `--radius-card` (`1.25rem`). Boutons = rectangles arrondis (`rounded-lg`/`rounded-xl`), pas de pills ; badges = `rounded-full`.
- **Tracking** : `tracking-caps` (`0.16em`) pour les labels mono en capitales.
- **Ombres** : `shadow-drawer`, `shadow-float`, `shadow-sheet` (tiroir / flottant / bottom-sheet mobile).

### Dark mode & scoping

- **Dark mode scopé** via une classe `.dark` **sur l'app shell** (pas sur `<html>`) : marketing/auth restent clairs. Les tokens sémantiques (`paper`, `sand`, `line`, `ink`, `muted`, `fill`, `input`, `success-soft`, `warning-soft`) basculent ; **pine/lime ne changent jamais**.
- `.light-scope` **force le clair** dans un sous-arbre même sous `.dark` (cartes de modale, surfaces qui doivent rester claires). Toute surface pine re-fixe `paper` en clair pour garder son texte lisible.

## Composants disponibles (`components/ui/`)

> **Obligatoire : composer ces primitives.** Pas de `<button className>` / `<h1 className>` / `<select className>` ad hoc. Merge de classes toujours via `cn()` (`lib/cn.ts`).

| Composant                       | Props clés                                                                                                                                             | Usage                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                        | `variant` = `primary` \| `pine` \| `outline` \| `ghost` \| `subtle` \| `danger` · `size` = `sm` \| `md` \| `lg` \| `icon` · `href`                     | Toute action de type bouton. `primary` (lime) = accent fort ; `href` → rend un `Link` i18n                                                        |
| `Title`                         | `as` = `h1` \| `h2` \| `h3` \| `h4`                                                                                                                    | Tous les titres. **La balise EST l'API** : h1 hero · h2 titre de page · h3 section · h4 label de carte                                            |
| `Text`                          | `size` = `xs` \| `sm` \| `base` · `tone` = `muted` \| `ink` \| `strong` · `leading` · `as`                                                             | Copy / paragraphes `<p>`                                                                                                                          |
| `Badge`                         | `tone` = `neutral` \| `warning` \| `success` \| `danger` \| `info` \| `pine` \| `link` · `size` = `sm` \| `md` · `dot`                                 | Pastilles de statut / label. Ex. « Non connecté » = `<Badge tone="warning" dot>`                                                                  |
| `Select`                        | `label` · `options: {value,label}[]` · props natives                                                                                                   | Select natif stylé. Marche contrôlé **et** via `{...register(name)}`                                                                              |
| `Card`                          | `variant` = `surface` \| `pine` · `pad` = `sm` \| `md` \| `lg` · `as` = `div`\|`section`\|`aside`\|`article`                                           | Bloc arrondi (radius/bordure/fond viennent d'ici). `StatCard` = variante métrique (label + valeur + trend)                                        |
| `Modal`                         | `open` · `onClose` · `title` · `size` = `sm`…`3xl`                                                                                                     | Dialogue : bottom-sheet mobile (slide-up) / carte centrée ≥sm, backdrop flou. Ferme sur Escape + clic backdrop. Gère le chrome, le body est à toi |
| `Container`                     | `className`                                                                                                                                            | Largeur max page (`max-w-6xl`) + gouttières responsives                                                                                           |
| `SectionLabel`                  | `index` · `tone` = `muted` \| `lime` \| `pine`                                                                                                         | Kicker numéroté en Geist Mono capitales trackées                                                                                                  |
| `LocaleSwitcher` / `LocaleMenu` | —                                                                                                                                                      | Sélecteur de langue                                                                                                                               |
| `Lightbox`                      | —                                                                                                                                                      | Visionneuse d'image en overlay                                                                                                                    |
| `Combobox`                      | `label` · `options: {value,label}[]` · `disabled` · `emptyLabel` · `resultsLabel` (template `"{count}"`) · `defaultQuery` · `defaultOpen` · `onSelect` | Champ de saisie filtrable, clavier + souris. Voir § Combobox                                                                                      |
| `ChartLine` / `ChartBar`        | `data: Record<string, string \| number>[]` · `xKey` · `series: {key,label,color?}[]` · `height`                                                        | Graphique ligne / barres encapsulant Recharts. Voir § Data viz                                                                                    |
| `ChartDonut`                    | `data: {key,label,value,color?}[]` · `height`                                                                                                          | Graphique donut encapsulant Recharts. Voir § Data viz                                                                                             |

## Combobox

- **Écrit à la main** (s14-dataviz-and-combobox) : `select.tsx` wrappe un `<select>` natif (pas de filtre, pas de saisie libre) et ne pouvait pas servir de base. Aucune dépendance ajoutée — un package tiers exigerait un nouvel ADR.
- **Accessibilité livrée** : un **nom accessible** via un vrai `<label htmlFor={inputId}>` associé au champ (jamais le `placeholder`, optionnel, en repli — trouvé en revue : un `<span>` nu à côté du champ, ou un `aria-label` posé sur le popup au lieu du contrôle, laissent le champ sans nom), `role="combobox"` sur le champ, `aria-expanded` / `aria-controls` / `aria-activedescendant`, popup `role="listbox"` avec `role="option"`, gestion ↑ ↓ Entrée Échap Début Fin, focus **jamais** déplacé hors du champ (sélection via `aria-activedescendant`, clic géré en `onMouseDown` + `preventDefault` pour ne jamais blur l'input), et une région `aria-live="polite"` annonçant le nombre de résultats filtrés (`resultsLabel`, gabarit i18n avec `"{count}"`).
- **États livrés** : vide (aucun résultat filtré → un unique `role="option"` `aria-disabled` portant le message `emptyLabel`, dans le même `role="listbox"` avec `aria-label` que l'état peuplé — un listbox n'a pas d'enfant texte libre valide) et désactivé (`disabled`, popup jamais ouverte).
- **Non vérifiable en CI** : ce repo n'a ni jsdom/happy-dom ni testing-library (voir `components-map.test.ts`) — l'interaction clavier réelle n'est pas prouvée par Vitest, seule la présence de la surface ARIA dans la source l'est (`components/ui/combobox.test.ts`). Vérifiée par ailleurs sur le DOM réellement servi (voir le rapport de la story).

## Data viz

- **Recharts** (ADR 006), encapsulé derrière `components/ui/chart-line.tsx`, `chart-bar.tsx`, `chart-donut.tsx`. **Aucun écran n'importe `recharts` directement** — gardé par `components/ui/chart-encapsulation.test.ts` (équivalent d'un `git grep -l 'from "recharts"' -- app components` qui ne doit renvoyer que les wrappers).
- **Couleurs** : chaque série reçoit sa couleur explicitement via `var(--color-…)` (palette : `lime`, `link`, `success`, `warning`, `danger`, `cat-sector`), jamais un défaut Recharts. Recharts applique ses propres couleurs de série par défaut dès qu'aucun `fill`/`stroke` n'est passé, et `check-design-tokens` ne les voit pas (il ne parcourt que `app|components|lib`) : un graphe non coloré serait hors palette avec un **build vert**. Vérifié par `components/ui/chart-tokens.test.ts` (regard source) et sur le rendu réel (voir le rapport de la story).
- **Mode sombre** : les couleurs passent par des `var(--color-…)`, résolues par le navigateur à chaque peinture — elles suivent donc la bascule `.dark` sans code supplémentaire.
- **Client Components** : les trois wrappers portent `"use client"` ; les pages qui les utilisent restent des Server Components (elles rendent le composant client, elles ne lisent aucun de ses exports comme des données — piège documenté par s13, voir la story).
- **API volontairement étroite** : `ChartLine`/`ChartBar` prennent `data` + `xKey` + `series: {key,label,color?}[]` + `height` ; `ChartDonut` prend `data: {key,label,value,color?}[]` (pas de `xKey` ni de `series` — chaque slice porte sa propre valeur) + `height`. Pas de pass-through de l'API Recharts complète — un besoin non couvert est un gap à étendre plus tard, pas à contourner en exposant tout.
- **Limite connue (mesurée, s14)** : le rendu SSR de Recharts 3 (moteur interne redux) produit un conteneur (`div.recharts-wrapper`) mais pas le SVG interne (axes, lignes, barres, secteurs) tant que le composant n'a pas été hydraté côté client — voir le rapport de la story pour la vérification exacte. Les graphes restent donc invisibles jusqu'à l'hydratation, y compris sur un artefact `DEMO_MODE=1`.

## Patterns UI imposés

- **Formulaires** : react-hook-form + `zodResolver`. Schéma zod **colocalisé** (`*-schema.ts`), type via `z.infer`, messages d'erreur = **clés i18n**, `mode: "onBlur"`, listes dynamiques via `useFieldArray`. Champs → primitive `Select` ou input stylé sur les mêmes tokens (`border-line bg-input focus:border-pine focus:ring-pine/10`).
- **États (empty / loading / error / success)** : composés avec les primitives — pas de composant d'état dédié. Erreur destructive → `Button variant="danger"` / texte `text-danger` / `Badge tone="danger"`. Succès → `text-success` / `Badge tone="success"`. Vide → `Card` + `Title as="h3"` + `Text tone="muted"`.
- **Feedback** : **inline uniquement** (pas de toast dans le boilerplate). Statut = `Badge` ; erreur de formulaire = message sous le champ (clé i18n). Les actions renvoient un result object `{ ok } | { ok:false, error }` — pas d'exception jetée.
- **Overlays** : classes d'animation prêtes (`overlay-fade`, `overlay-panel`, `overlay-drawer` + variantes `-out`), GPU-friendly, coupées sous `prefers-reduced-motion`. Le `Modal` les utilise déjà — ne pas réanimer à la main.
- **Z-index** (échelle de référence) : 10-20 interne carte · 30 barres fixes · 40 panneaux persistants · 50 overlays modaux · 60 statuts transitoires.
- **Layout** : envelopper le contenu de page dans `Container`. Cartes via `Card` (jamais `rounded-2xl border …` ad hoc).
- **i18n** : aucune string en dur ; navigation via `@/i18n/navigation` (jamais `next/link`) ; fr + en mises à jour ensemble.

## Do / Don't

- ✅ Composer `components/ui/*` (`Button`, `Title`, `Text`, `Badge`, `Card`, `Modal`, `Select`, `Combobox`, `Container`, `SectionLabel`, `ChartLine`, `ChartBar`, `ChartDonut`).
- ✅ N'utiliser que des **classes de token** : `bg-pine`, `text-lime`, `text-ink`, `border-line`, `font-display`, `rounded-xl`, `tracking-caps`, `shadow-float`.
- ✅ Lime = **un seul accent fort par surface** (CTA principal ou état actif), texte foncé dessus.
- ✅ Merge de classes via `cn()`. Radius/bordure/fond d'une carte viennent de `Card`.
- ✅ Un besoin non couvert = **ajouter un token dans `@theme`** ou signaler un « design system gap », jamais improviser.
- ❌ Valeur arbitraire de couleur/radius/font-size/tracking/shadow (`text-[#…]`, `rounded-[12px]`, `text-[13px]`, `tracking-[0.16em]`, `shadow-[…]`) — casse le build.
- ❌ `<button className>` / `<h1 className>` / `<select className>` ad hoc au lieu des primitives.
- ❌ Texte **blanc** sur lime (toujours pine/foncé) ; lime en aplat de fond large (c'est un accent, pas une surface).
- ❌ Inventer un composant, un ton de badge ou un `variant` qui n'existe pas dans le tableau ci-dessus.
- ❌ Réintroduire le registre CV (voir ci-dessous).

## Hors périmètre (registre CV strippé — ne pas réintroduire)

Ces tokens/polices existent dans `applyzi-flagship` pour l'artefact CV imprimé. ui-starter n'a **pas** de domaine CV — ne pas les recréer dans `@theme` :

- **Polices serif** : `font-serif` (Fraunces), `font-read` (Newsreader) — servent uniquement le CV généré.
- **Couleurs de catégories de compétences** : `cat-tools` / `cat-tools-soft`, `cat-people` / `cat-people-dot` / `cat-people-soft` (la paire `cat-sector*` reste, elle back le badge `info`).
- **Impression / PDF** : `#cv-print`, `.print-page` et les règles `@media print`.
- **Animation d'onboarding « import »** : keyframes/classes `ob-*` (décoratif, spécifique au flux CV).

Cf. `docs/architecture.md` (§ Design/UX) et ADR 001–003 (fork strippé, cimetière domaine CV).
