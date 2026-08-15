# ADR 002 — Design system : tokens Tailwind v4 `@theme` + garde-fou

- Status: accepted
- Date: 2026-08-15
- Scope: framing

## Context
L'angle #1 du PRD : « je change une palette, tout l'UI suit ». Il faut un mécanisme de re-theme fiable et un garde-fou empêchant la dérive (couleurs codées en dur qui échapperaient au swap). Applyzi fournit déjà les deux.

## Decision
Le design system repose sur une **source unique de tokens : le bloc `@theme` de `app/globals.css`** (Tailwind v4 CSS-first, sans `tailwind.config`). Re-thémer = éditer ce bloc (+ overrides `.dark`/`.light-scope`). Le **garde-fou `scripts/check-design-tokens.mjs`** (`npm run lint:design` + auto au `prebuild`) reste actif et **interdit les valeurs arbitraires** Tailwind sur couleur, radius, font-size, letter-spacing, box-shadow (les dims de layout one-off restent autorisées).

## Considered options
- **Config Tailwind classique (`tailwind.config.js` `theme.extend`)** — rejeté : Tailwind v4 est CSS-first ; réintroduire un config JS irait à contre-courant de la base et dédoublerait la source de vérité.
- **Variables CSS libres sans garde-fou** — rejeté : sans le check, des `bg-[#hex]` finiraient par se glisser et casseraient la promesse « change une palette, tout suit ».
- **CSS-in-JS / thème runtime** — rejeté : overkill, hors stack, coût perf/DX injustifié pour un starter.

## Consequences
- **Plus facile** : re-theme en 1 fichier ; le build échoue mécaniquement si une couleur brute est introduite → promesse tenue by design.
- **Plus dur** : toute nouvelle primitive doit passer par des tokens (discipline imposée) ; les tokens de marque Applyzi (pine/lime, fonts serif CV) doivent être remplacés par des tokens placeholder neutres.
- **À surveiller** : garder le check dans les hooks `prebuild`/lint-staged lors du strip (ne pas le retirer avec les scripts CV).
