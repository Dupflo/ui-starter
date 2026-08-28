---
validated: yes
---

# Plan — Story s10-defect-sweep

Branch: `feature/s10-defect-sweep`
Research: `docs/research/s10-defect-sweep.md` — read it first; this plan does not repeat it.

## Target story

Purger les défauts hérités du fork `applyzi-flagship` encore présents dans le starter
livré (s01→s08 mergées). Complexité réelle : **2** — chaque tâche est petite et bornée,
mais deux d'entre elles se vérifient uniquement sur l'artefact compilé, pas sur la source.

## Tasks

- [x] **T1 — Supprimer la couche print CV.** Retirer `#cv-print { display:none }` et le
      bloc `@media print` de `app/globals.css`. Le remplacer par un reset print neutre qui
      force **à la fois** `background` et `color` sur `html, body`, pour qu'aucun élément
      héritant de la couleur du body n'imprime en blanc sur blanc.
      _Vérification_: build, puis grep de la feuille émise dans `.next` — zéro `cv-print`,
      zéro règle print masquant `body > *`. Test: un test qui lit `app/globals.css` et
      échoue si `body > *` réapparaît sous `@media print`.

- [x] **T2 — `import "server-only"` sur `lib/supabase/service-role.ts`** et suppression
      du ré-export mort dans `lib/supabase/server.ts:5`.
      _Vérification_: build vert ; puis prouver que le garde-fou mord — créer un Client
      Component jetable qui importe `createServiceRoleClient`, constater l'échec du build,
      le supprimer, et vérifier `git diff --exit-code` propre. Test colocalisé qui épingle
      la présence de l'import.

- [x] **T3 — Corriger le wordmark invisible.** `app/[locale]/pricing/page.tsx` : passer
      `variant="light"`. Puis auditer les 4 call sites en lisant la classe de surface réelle
      de chacun et confirmer sur la **feuille compilée** qu'aucun n'a le token du wordmark
      égal à celui de son fond, en clair et en sombre.
      _Vérification_: test épinglant la surface + le variant pour `/pricing`. Rapporter les
      4 couples (surface, variant).

- [x] **T4 — Neutraliser le favicon.** Redessiner `public/favicon.svg` avec une marque
      géométrique neutre et retirer le commentaire XML Applyzi. Vérifier qu'aucun autre
      support d'icône (manifest, apple-touch-icon, `icon.*`) ne porte l'ancienne marque.
      _Vérification_: test qui lit le fichier et interdit `applyzi` + les anciens `<path>`.

  > Note d'exécution : PR #9 (`feature/s09-init-command`, mergée avant cette branche)
  > retire déjà le commentaire XML mais laisse le tracé "A" Applyzi en place — sans T4
  > l'onglet du navigateur reste littéralement le logo Applyzi. T4 redessine donc le
  > tracé lui-même (pas seulement le commentaire) ; c'est la seule tâche qui corrige
  > réellement ce défaut.

- [x] **T5 — Purger les résidus de branding restants.** ~~`scripts/backup-prod.sh`
      (généraliser : plus de référence projet prod en dur, plus de chemin `applyzi-prod-*`),
      `components/cookie-banner.tsx:9`, `app/globals.css:255`.~~ Gitignorer `backups/`.
      _Vérification_: `git grep -in applyzi -- app components lib public scripts` ne renvoie
      plus que les regex de garde des tests.

  > Note d'exécution : PR #9 (mergée avant cette branche) supprime `scripts/backup-prod.sh`
  > et reformule déjà `components/cookie-banner.tsx` et le commentaire onboarding de
  > `app/globals.css`. T5 se réduit donc à gitignorer `backups/` — le reste de la tâche
  > est couvert par #9, pas dupliqué ici.

- [x] **T6 — Trancher la question des polices.** _Mesurer d'abord_ : builder, puis
      compter `@font-face` dans la feuille émise et lister `.next/static/media`.
  - **Décision humaine (28/08/2026) : charger réellement les polices**, via `next/font`
    self-hosté, en conservant les noms de tokens (`font-display`, `font-ui`, `font-mono`).
    Bénéfice attendu au-delà de la typographie : zéro requête vers un CDN tiers (RGPD,
    perf, CSP). Corriger le doc n'est PAS l'option retenue.
  - Contrainte : General Sans est sur Fontshare, pas sur Google Fonts — `next/font/google`
    ne le couvre pas. Si les fichiers ne peuvent pas être récupérés/committés, remonter
    le blocage et proposer, sans trancher seul, plutôt que de substituer une autre face.
  - Retirer `Fraunces` et `Newsreader` de l'`@import` : faces du registre CV, aucun
    consommateur.
    _Vérification_: rapporter la mesure avant/après, chiffres à l'appui.

  > Note d'exécution (résolution du blocage licence) : General Sans (Fontshare, FFL
  > v2.0) ne pouvait pas être self-hosté via `next/font/local` sans committer les
  > `.woff2` — la FFL clause 02 interdit explicitement la distribution par
  > "repository" et clause 01 interdit le subsetting/la conversion de format que
  > `next/font/local` effectue. Blocage remonté sans trancher seul, comme prévu par
  > la tâche. **Décision humaine (28/08/2026) : remplacer General Sans par Plus
  > Jakarta Sans (OFL, Google Fonts)**, chargée via `next/font/google` comme Geist /
  > Geist Mono — rien n'est committé, le problème ne peut pas se reproduire dans un
  > fork. Noms de tokens inchangés (`font-display`/`font-ui`/`font-mono`). Mesure
  > avant/après sur l'artefact compilé : 33 → 42 `@font-face`, `.next/static/media`
  > 14 → 15 fichiers, toujours 0 `@import` distant. Cette décision et sa justification
  > n'existaient jusqu'ici que dans le message du commit 77073fc ; consignées ici
  > pour que le plan reflète la réalité livrée.

## Definition of Done

- Les 6 tâches cochées, chacune avec sa vérification exécutée.
- Gates verts : `npm run test` · `lint:design` · `typecheck` · `build` · `lint`
  (les 4 warnings `react-hooks/set-state-in-effect` hérités restent tolérés).
- Un seul commit sur `feature/s10-defect-sweep`.
- Aucun re-theming, aucune modification de composant hors des call sites listés.

## Files touched (prévision)

`app/globals.css` · `app/[locale]/pricing/page.tsx` · `lib/supabase/service-role.ts` ·
`lib/supabase/server.ts` · `public/favicon.svg` · `scripts/backup-prod.sh` ·
`components/cookie-banner.tsx` · `.gitignore` · tests colocalisés · éventuellement
`docs/design-system.md` (T6, seulement si l'option "corriger le doc" est retenue).

## Files touched (réel — voir notes T4/T5)

PR #9 (`feature/s09-init-command`), mergée avant cette branche, touchait déjà
`scripts/backup-prod.sh` (supprimé), `components/cookie-banner.tsx` et le commentaire
onboarding de `app/globals.css` — non retouchés ici pour éviter le doublon/conflit.
Périmètre réellement livré : `app/globals.css`, `app/[locale]/pricing/page.tsx`,
`app/[locale]/page.test.ts`, `app/[locale]/layout.tsx`, `app/[locale]/layout.font.test.ts`,
`lib/supabase/service-role.ts`, `lib/supabase/service-role.test.ts`,
`lib/supabase/server.ts`, `public/favicon.svg`, `favicon.test.ts` (racine du repo,
pas `public/` — un test dans `public/` serait servi comme asset web statique),
`public-assets.test.ts`, `.gitignore`, `gitignore.test.ts`, `app/globals.print.test.ts`,
`app/globals.fonts.test.ts`, `app/fonts/index.ts`, `app/fonts/index.test.ts`,
`docs/design-system.md` (corrigé pour matcher `@theme` après la bascule de police —
voir note T6 ci-dessus).

`app/fonts/files/general-sans/*` a existé brièvement (essai `next/font/local`) puis a
été supprimé dans le même balayage, une fois le blocage licence résolu par la
décision humaine ci-dessus (Plus Jakarta Sans) — n'a jamais fait partie du livré
final, ne figure plus ici.
