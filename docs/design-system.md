# Design System — ui-starter

> **Source de vérité : le bloc `@theme` de `app/globals.css`** (Tailwind v4 CSS-first, pas de `tailwind.config`). Ce document *capture* ce système pour que `/ks-design` le consomme à chaque story UI — il ne l'invente pas.
> ui-starter est un fork d'`applyzi-flagship` **strippé du domaine CV**. On garde le **chrome de l'app** (pine + lime, General Sans / Geist) ; le **registre artefact CV** (serif Fraunces/Newsreader, couleurs de catégories de compétences) est hors périmètre — voir la dernière section.
> **Règle de fer (ADR 002)** : aucune valeur arbitraire de couleur / radius / font-size / tracking / shadow. Toujours une classe de token. Un besoin absent = **ajouter un token dans `@theme`**, jamais un `text-[#hex]` (le guard `check-design-tokens` casse le build au `prebuild`).

## Tokens

### Couleurs — marque
| Token (classe) | Valeur | Usage |
|---|---|---|
| `pine` | `#10301E` | Vert sombre de marque — chrome (sidebar, cartes pine, bandeaux), fond `<body>` |
| `pine-900` | `#0B2014` | Pine plus sombre — hover des surfaces pine |
| `lime` | `#C5F24D` | **Accent fort unique** — CTA principal / état actif. Texte foncé dessus, jamais blanc |
| `ink` | `#161616` | Texte principal (light) |

### Couleurs — surfaces & neutres
| Token | Valeur | Usage |
|---|---|---|
| `paper` | `#F9FAF9` | Surface de carte claire · aussi foreground clair sur surfaces pine |
| `sand` | `#F5F8F2` | Canvas / fond d'espace de travail |
| `line` | `#E2E8DD` | Filets / bordures |
| `line-strong` | `#D6DAD2` | Séparateur / bordure plus marquée |
| `muted` | `#5C6B62` | Texte secondaire |
| `muted-ink` | `#6B6B6B` | Texte secondaire neutre (gris) |
| `muted-soft` | `#9AA89F` | Texte tertiaire très discret |
| `fill` | `#F4F6F1` | Remplissage pâle (inputs, segmented, placeholders) |
| `fill-mute` | `#ECEFE9` | Remplissage atténué / hairline |
| `input` | `#FFFFFF` | Fond des contrôles de formulaire (blanc en light) |

### Couleurs — sémantiques
| Token | Valeur | Usage |
|---|---|---|
| `ink-strong` | `#0F1A14` | Titres de l'app |
| `link` | `#3F7A57` | Liens texte verts inline |
| `success` | `#1F8A4C` | Positif / envoyé / tendance ↑ |
| `success-soft` | `#E4F4EA` | Fond pâle de succès |
| `danger` | `#C5402E` | Destructif / erreurs |
| `warning` | `#C9810A` | Avertissement / non connecté |
| `warning-soft` | `#F7EDDB` | Fond pâle d'avertissement |
| `on-pine` | `#AECBB8` | Texte atténué sur surface pine |
| `on-pine-bright` | `#CFE3D6` | Texte plus clair sur surface pine |
| `cat-sector` / `cat-sector-soft` | `#1F4E8C` / `#EEF2FB` | Bleu — **back le badge `info`** (seule paire `cat-*` conservée) |

### Typographie
| Token (classe) | Police | Usage |
|---|---|---|
| `font-display` | General Sans (500/600/700) | Titres (`Title`) |
| `font-ui` | Geist | Corps de texte, UI, boutons (police par défaut du `<body>`) |
| `font-mono` | Geist Mono | Labels mono en capitales trackées (`SectionLabel`) |

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

| Composant | Props clés | Usage |
|---|---|---|
| `Button` | `variant` = `primary` \| `pine` \| `outline` \| `ghost` \| `subtle` \| `danger` · `size` = `sm` \| `md` \| `lg` \| `icon` · `href` | Toute action de type bouton. `primary` (lime) = accent fort ; `href` → rend un `Link` i18n |
| `Title` | `as` = `h1` \| `h2` \| `h3` \| `h4` | Tous les titres. **La balise EST l'API** : h1 hero · h2 titre de page · h3 section · h4 label de carte |
| `Text` | `size` = `xs` \| `sm` \| `base` · `tone` = `muted` \| `ink` \| `strong` · `leading` · `as` | Copy / paragraphes `<p>` |
| `Badge` | `tone` = `neutral` \| `warning` \| `success` \| `danger` \| `info` \| `pine` \| `link` · `size` = `sm` \| `md` · `dot` | Pastilles de statut / label. Ex. « Non connecté » = `<Badge tone="warning" dot>` |
| `Select` | `label` · `options: {value,label}[]` · props natives | Select natif stylé. Marche contrôlé **et** via `{...register(name)}` |
| `Card` | `variant` = `surface` \| `pine` · `pad` = `sm` \| `md` \| `lg` · `as` = `div`\|`section`\|`aside`\|`article` | Bloc arrondi (radius/bordure/fond viennent d'ici). `StatCard` = variante métrique (label + valeur + trend) |
| `Modal` | `open` · `onClose` · `title` · `size` = `sm`…`3xl` | Dialogue : bottom-sheet mobile (slide-up) / carte centrée ≥sm, backdrop flou. Ferme sur Escape + clic backdrop. Gère le chrome, le body est à toi |
| `Container` | `className` | Largeur max page (`max-w-6xl`) + gouttières responsives |
| `SectionLabel` | `index` · `tone` = `muted` \| `lime` \| `pine` | Kicker numéroté en Geist Mono capitales trackées |
| `LocaleSwitcher` / `LocaleMenu` | — | Sélecteur de langue |
| `Lightbox` | — | Visionneuse d'image en overlay |

## Patterns UI imposés

- **Formulaires** : react-hook-form + `zodResolver`. Schéma zod **colocalisé** (`*-schema.ts`), type via `z.infer`, messages d'erreur = **clés i18n**, `mode: "onBlur"`, listes dynamiques via `useFieldArray`. Champs → primitive `Select` ou input stylé sur les mêmes tokens (`border-line bg-input focus:border-pine focus:ring-pine/10`).
- **États (empty / loading / error / success)** : composés avec les primitives — pas de composant d'état dédié. Erreur destructive → `Button variant="danger"` / texte `text-danger` / `Badge tone="danger"`. Succès → `text-success` / `Badge tone="success"`. Vide → `Card` + `Title as="h3"` + `Text tone="muted"`.
- **Feedback** : **inline uniquement** (pas de toast dans le boilerplate). Statut = `Badge` ; erreur de formulaire = message sous le champ (clé i18n). Les actions renvoient un result object `{ ok } | { ok:false, error }` — pas d'exception jetée.
- **Overlays** : classes d'animation prêtes (`overlay-fade`, `overlay-panel`, `overlay-drawer` + variantes `-out`), GPU-friendly, coupées sous `prefers-reduced-motion`. Le `Modal` les utilise déjà — ne pas réanimer à la main.
- **Z-index** (échelle de référence) : 10-20 interne carte · 30 barres fixes · 40 panneaux persistants · 50 overlays modaux · 60 statuts transitoires.
- **Layout** : envelopper le contenu de page dans `Container`. Cartes via `Card` (jamais `rounded-2xl border …` ad hoc).
- **i18n** : aucune string en dur ; navigation via `@/i18n/navigation` (jamais `next/link`) ; fr + en mises à jour ensemble.

## Do / Don't

- ✅ Composer `components/ui/*` (`Button`, `Title`, `Text`, `Badge`, `Card`, `Modal`, `Select`, `Container`, `SectionLabel`).
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

- **Polices serif** : `font-serif` (Fraunces), `font-read` (Newsreader) + leurs `@import` — servent uniquement le CV généré.
- **Couleurs de catégories de compétences** : `cat-tools` / `cat-tools-soft`, `cat-people` / `cat-people-dot` / `cat-people-soft` (la paire `cat-sector*` reste, elle back le badge `info`).
- **Impression / PDF** : `#cv-print`, `.print-page` et les règles `@media print`.
- **Animation d'onboarding « import »** : keyframes/classes `ob-*` (décoratif, spécifique au flux CV).

Cf. `docs/architecture.md` (§ Design/UX) et ADR 001–003 (fork strippé, cimetière domaine CV).
