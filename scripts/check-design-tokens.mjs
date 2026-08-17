#!/usr/bin/env node
/**
 * Design-system guard — forbids arbitrary Tailwind values in the categories that
 * must come from the design tokens (@theme in app/globals.css):
 *   colour · border-radius · font-size · letter-spacing · box-shadow
 *
 * One-off layout dimensions (h-[62px], w-[330px], p-[3px], border-[1.5px],
 * ring-[3px], leading-[1.05], aspect-[…]) are intentionally allowed.
 *
 * If you hit a violation: add a token to @theme and use its utility instead.
 * Run: `npm run lint:design` (also runs automatically before `npm run build`).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = /\.(tsx?|jsx?)$/;

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

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
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
  console.log(
    `✓ design tokens: no arbitrary values in ${files.length} files (colour, radius, font-size, tracking, shadow).`,
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
