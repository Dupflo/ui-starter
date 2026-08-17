# Re-theming in 1 step

The entire app palette is controlled by a single file: `app/globals.css`.

## The single edit point

Open `app/globals.css` and locate the `@theme` block (lines 12–73). All design tokens live there. Every Tailwind utility that names a token (`bg-paper`, `text-ink`, `border-line`, `fill-lime`…) resolves to the matching CSS custom property at build time. Change the token value → every surface updates, with no component edits required.

The palette is defined in **three registers** that must be kept in sync:

| Register     | Location             | When active                                                   |
| ------------ | -------------------- | ------------------------------------------------------------- |
| Base / light | `@theme { … }`       | Default (light)                                               |
| Dark mode    | `.dark { … }`        | When `.dark` class is on the app shell                        |
| Forced light | `.light-scope { … }` | Modal cards and CV artifact — always light even under `.dark` |

Additionally, `.dark .bg-pine` and `.dark .bg-pine-900` re-pin `--color-paper` to the light value so text on brand (pine) surfaces stays legible in dark mode. If you rename or replace `pine`, update that block too.

## Token groups

| Group               | Token names                                                                                                                                                                                                      | Usage                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Brand               | `--color-pine`, `--color-pine-900`, `--color-lime`                                                                                                                                                               | Primary brand colour, deep variant, accent          |
| Surfaces / neutrals | `--color-paper`, `--color-sand`, `--color-fill`, `--color-fill-mute`, `--color-input`, `--color-line`, `--color-line-strong`, `--color-muted`, `--color-muted-ink`, `--color-muted-soft`, `--color-success-soft` | Backgrounds, borders, muted text                    |
| Semantics           | `--color-ink`, `--color-ink-strong`, `--color-link`, `--color-success`, `--color-danger`, `--color-warning`, `--color-warning-soft`                                                                              | Text, status colours                                |
| On-brand            | `--color-on-pine`, `--color-on-pine-bright`                                                                                                                                                                      | Text/icon colours on pine surfaces                  |
| Typography          | `--font-display`, `--font-ui`, `--font-mono`                                                                                                                                                                     | Font stacks (General Sans, Geist, Geist Mono)       |
| Type scale          | `--text-2xs`                                                                                                                                                                                                     | Extends the default Tailwind scale at the small end |
| Tracking            | `--tracking-caps`                                                                                                                                                                                                | Uppercase label letter-spacing                      |
| Elevation           | `--shadow-drawer`, `--shadow-float`, `--shadow-sheet`                                                                                                                                                            | Depth shadows                                       |
| Radius              | `--radius-card`                                                                                                                                                                                                  | Card corner radius                                  |

To re-theme: replace the `--color-pine` / `--color-lime` values in all three registers with your brand colours, and update `--color-on-pine` / `--color-on-pine-bright` to foreground colours that contrast well against your new brand surface.

## Verification

After editing, run:

```bash
npm run lint:design
```

This script walks `app/`, `components/`, and `lib/` for `.tsx/.ts/.jsx/.js` files and fails if any raw colour (hex literal, `rgb()`/`oklch()` function, or bare Tailwind built-in like `bg-white`/`text-black`/`bg-blue-500`) is found outside the token layer. The same check runs automatically before every build via `prebuild`.

If it exits non-zero, the output names the file, line, and category — fix by mapping the raw colour to an `@theme` token.

## Allowlisted exceptions

Two sites use raw colours for technical reasons and are exempted via a per-line `/* design-tokens-allow: <reason> */` sentinel comment:

1. **`app/global-error.tsx`** — inline hex (`#10301E`, `#F5F5F0`, `#C5F24D`) in the body `style={{}}` block. The root error boundary renders without the app's CSS bundle, so token utilities are unavailable.
2. **`components/auth/google-button.tsx`** — SVG `fill` colours (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`). Google's fixed brand colours per brand guidelines; not themeable.

To add a new exemption: add the sentinel to the exact line, extend the exhaustive list in the `check-design-tokens.mjs` script header, and get a review sign-off.
