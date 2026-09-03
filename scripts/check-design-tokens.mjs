#!/usr/bin/env node
/**
 * Design-system guard — forbids arbitrary Tailwind values in the categories that
 * must come from the design tokens (@theme in app/globals.css):
 *   colour · border-radius · font-size · letter-spacing · box-shadow
 *
 * Also forbids raw colours outside tokens:
 *   raw-hex          — #rgb / #rrggbb / #rrggbbaa literals in inline styles or SVG
 *   raw-colour-fn    — rgb() / rgba() / hsl() / hsla() / oklch() / oklab() / lab() /
 *                      lch() / color() literals in a string/style context
 *   bare-palette-utility — bare Tailwind built-in colour utilities that bypass the
 *                      token layer: bg-white, text-black, bg-blue-500, text-red-300…
 *                      Token utilities (bg-lime, fill-pine, text-ink-strong) have NO
 *                      numeric suffix and are @theme names — they do NOT match.
 *
 * One-off layout dimensions (h-[62px], w-[330px], p-[3px], border-[1.5px],
 * ring-[3px], leading-[1.05], aspect-[…]) are intentionally allowed.
 *
 * If you hit a violation: add a token to @theme and use its utility instead.
 * Run: `npm run lint:design` (also runs automatically before `npm run build`).
 *
 * ── Inline allowlist ──────────────────────────────────────────────────────────
 * Sentinel: `/* design-tokens-allow: <reason> *\/` on the violating line or on
 * one of the two immediately preceding lines. The two-line lookback handles
 * prettier-formatted multi-line JSX elements where the sentinel comment sits
 * above the element's opening tag:
 *   {/* design-tokens-allow: … *\/}   ← sentinel JSX comment
 *   <path                              ← element open (line N+1)
 *     fill="#…"                        ← violation line (line N+2)
 * The guard skips that match and logs the skip.
 *
 * EXHAUSTIVE list of allowed sites (must stay narrow — no wildcards):
 *   1. app/global-error.tsx  — inline hex (#10301E, #F5F5F0, #C5F24D) in style={{}}
 *      Reason: root error boundary renders without the app CSS bundle; token
 *      utilities are unavailable, so raw values are the only safe option.
 *   2. components/auth/google-button.tsx — SVG fill colours (#4285F4, #34A853,
 *      #FBBC05, #EA4335)
 *      Reason: Google's fixed brand colours per brand guidelines; not themeable.
 *   3. components/gallery/avatar-fixtures.ts — TOKEN_HEX (#1f8a4c, #c9810a,
 *      #f9f9fb)
 *      Reason: literal copies of app/globals.css's @theme colour tokens, used to
 *      build inline SVG data-URI demo avatars (s18-ui-kit-polish). A data-URI
 *      SVG rendered inside an <img> is an isolated document with no access to
 *      the parent page's CSS custom properties, so var(--color-…) cannot be
 *      used there — literal hex is the only option. Cross-checked against
 *      app/globals.css by avatar-fixtures.test.ts, so a token value changing
 *      there cannot silently drift here.
 *
 * To add a new site: add the sentinel to the exact line, extend this list, and
 * get a review sign-off — do NOT add path-glob wildcards.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = /\.(tsx?|jsx?)$/;

const ALLOW_SENTINEL = "design-tokens-allow";

// Each rule: a category label + a regex matching a forbidden arbitrary value.
const RULES = [
  {
    category: "colour",
    // any colour-capable prefix followed by a hex or colour-function literal
    re: /\b(?:text|bg|border|ring|ring-offset|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret|accent)-\[(?:#[0-9A-Fa-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|color|lab|lch)\()/g,
    hint: "use a --color-* token (text-ink, bg-fill, border-danger…)",
  },
  {
    category: "border-radius",
    re: /\brounded(?:-[a-z]+)*-\[[^\]]+\]/g,
    hint: "use the radius scale (rounded-sm…rounded-2xl)",
  },
  {
    category: "font-size",
    re: /\btext-\[[0-9.]+(?:px|rem|em)\]/g,
    hint: "use the type scale (text-2xs, text-xs, text-sm, text-base…)",
  },
  {
    category: "letter-spacing",
    re: /\btracking-\[[^\]]+\]/g,
    hint: "use a --tracking-* token (tracking-widest, tracking-caps)",
  },
  {
    category: "box-shadow",
    re: /\bshadow-\[[^\]]+\]/g,
    hint: "use a --shadow-* token (shadow-drawer, shadow-float)",
  },
  // ── NEW RULES (appended — do not reorder the five above) ──────────────────
  {
    category: "raw-hex",
    // A #rgb / #rrggbb / #rrggbbaa literal NOT already inside a -[…] bracket
    // (those are already caught by the 'colour' rule above).
    // Negative lookbehind ensures we're not inside a bracket arbitrary value.
    re: /(?<!\[)#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{2})?)?(?![0-9A-Fa-f])/g,
    hint: "inline hex must use CSS custom properties or the allowlist sentinel",
  },
  {
    category: "raw-colour-fn",
    // rgb( rgba( hsl( hsla( oklch( oklab( lab( lch( color( outside bracket syntax
    re: /(?<!\[)(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/g,
    hint: "colour functions must use CSS custom properties or the allowlist sentinel",
  },
  {
    category: "bare-palette-utility",
    // Bare bg-white / text-black / bg-blue-500 / text-red-300 etc.
    // Matches: prefix-white, prefix-black, or prefix-<named-palette>-<number>
    // Does NOT match token utilities like bg-lime, fill-pine (no numeric suffix,
    // and those names are @theme tokens, not Tailwind built-in palettes).
    re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|caret|accent|decoration)-(?:white|black|slate-[0-9]{2,3}|gray-[0-9]{2,3}|zinc-[0-9]{2,3}|neutral-[0-9]{2,3}|stone-[0-9]{2,3}|red-[0-9]{2,3}|orange-[0-9]{2,3}|amber-[0-9]{2,3}|yellow-[0-9]{2,3}|lime-[0-9]{2,3}|green-[0-9]{2,3}|emerald-[0-9]{2,3}|teal-[0-9]{2,3}|cyan-[0-9]{2,3}|sky-[0-9]{2,3}|blue-[0-9]{2,3}|indigo-[0-9]{2,3}|violet-[0-9]{2,3}|purple-[0-9]{2,3}|fuchsia-[0-9]{2,3}|pink-[0-9]{2,3}|rose-[0-9]{2,3})\b/g,
    hint: "use a --color-* token (bg-input for white surfaces, bg-fill, bg-paper…)",
  },
];

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else if (EXT.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const files = ROOTS.flatMap((r) => walk(r, []));
const violations = [];
let skippedByAllowlist = 0;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Check this line and up to two preceding lines for the allowlist sentinel.
    // Two-line lookback handles the prettier-formatted multi-line JSX pattern:
    //   {/* design-tokens-allow: … */}   ← sentinel
    //   <path                             ← element open
    //     fill="#…"                       ← violation line (two back from sentinel)
    const prevLine = i > 0 ? lines[i - 1] : "";
    const prevPrevLine = i > 1 ? lines[i - 2] : "";
    const isAllowed =
      line.includes(ALLOW_SENTINEL) ||
      prevLine.includes(ALLOW_SENTINEL) ||
      prevPrevLine.includes(ALLOW_SENTINEL);

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        if (isAllowed) {
          skippedByAllowlist++;
          continue;
        }
        violations.push({
          file: relative(process.cwd(), file),
          line: i + 1,
          category: rule.category,
          match: m[0],
          hint: rule.hint,
        });
      }
    }
  });
}

if (violations.length === 0) {
  const allowNote =
    skippedByAllowlist > 0
      ? ` (${skippedByAllowlist} allowlisted match${skippedByAllowlist > 1 ? "es" : ""} skipped)`
      : "";
  console.log(
    `✓ design tokens: no arbitrary values in ${files.length} files (colour, radius, font-size, tracking, shadow, raw-hex, raw-colour-fn, bare-palette-utility).${allowNote}`,
  );
  process.exit(0);
}

console.error(
  `\n✗ ${violations.length} arbitrary value(s) found in design-system categories.\n` +
    `  These must use a token from @theme (app/globals.css):\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.category}]  ${v.match}`);
  console.error(`      → ${v.hint}`);
}
console.error("");
process.exit(1);
