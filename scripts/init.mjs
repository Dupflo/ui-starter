#!/usr/bin/env node
/**
 * init.mjs — Scaffold a new SaaS project from the ui-starter base.
 *
 * Usage:  node scripts/init.mjs <project-name>
 *         npm run init <project-name>
 *
 * Copies the ui-starter tree (filtered via shouldInclude) + the parent
 * .claude/ pipeline into a sibling directory named <project-name>, rewrites
 * package.json name, seeds fresh docs/, and git-inits a clean repo.
 *
 * Pure, testable functions are exported at the module level.
 * The imperative shell (main) is guarded by an import.meta.url check so
 * importing this module for tests has NO side effects.
 */

import {
  existsSync,
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join, dirname, relative } from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

// ---------------------------------------------------------------------------
// Pure, exported functions
// ---------------------------------------------------------------------------

/**
 * Returns true if `raw` is a valid npm-compatible project name.
 * Rules: lowercase only, starts with [a-z0-9], then [a-z0-9-]*, no path
 * separators, no spaces, no leading dot, no `..`.
 *
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidProjectName(raw) {
  if (typeof raw !== "string") return false
  const trimmed = raw.trim()
  if (trimmed.length === 0) return false
  // npm name rules: [a-z0-9][a-z0-9-]*
  // - no uppercase, no spaces, no path chars, no leading dot or hyphen
  return /^[a-z0-9][a-z0-9-]*$/.test(trimmed)
}

/**
 * Converts a raw user-supplied name into a valid project slug:
 * - Trim, lowercase
 * - Spaces and underscores → hyphens
 * - Strip characters outside [a-z0-9-]
 * - Collapse consecutive hyphens
 * - Remove leading/trailing hyphens
 *
 * Output always satisfies isValidProjectName.
 *
 * @param {string} raw
 * @returns {string}
 */
export function slugifyProjectName(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/g, "") // strip disallowed chars
    .replace(/-{2,}/g, "-") // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
}

/**
 * Returns true if the repo-relative path should be copied into the generated
 * project. Acts as a deny-list first, then dotfile allow-list, then default-allow.
 *
 * @param {string} relPath  Repo-relative path (POSIX separators or OS-native)
 * @returns {boolean}
 */
export function shouldInclude(relPath) {
  // Normalize to forward slashes for consistent matching
  const p = relPath.replace(/\\/g, "/")

  // ── Deny list — never copy ──────────────────────────────────────────────

  // .git/ — exclude inherited history (fresh git init in target)
  if (p === ".git" || p.startsWith(".git/")) return false

  // node_modules/
  if (p === "node_modules" || p.startsWith("node_modules/")) return false

  // .next/ — Next.js build output
  if (p === ".next" || p.startsWith(".next/")) return false

  // dist/
  if (p === "dist" || p.startsWith("dist/")) return false

  // coverage/
  if (p === "coverage" || p.startsWith("coverage/")) return false

  // .turbo/
  if (p === ".turbo" || p.startsWith(".turbo/")) return false

  // *.tsbuildinfo — TypeScript incremental build info
  if (p.endsWith(".tsbuildinfo")) return false

  // .DS_Store
  if (p === ".DS_Store" || p.endsWith("/.DS_Store")) return false

  // *.log files
  if (p.endsWith(".log")) return false

  // .env.local — real secrets (NOT .env.local.example)
  if (p === ".env.local") return false

  // docs/ story history — drop plans, research, reviews (s01–s08 history)
  // Keep docs/decisions/ (structural ADRs apply to any fork)
  if (p.startsWith("docs/plans/")) return false
  if (p.startsWith("docs/research/")) return false
  if (p.startsWith("docs/reviews/")) return false
  // Reset framing docs (starter-specific; a fork starts fresh)
  const framingDocs = [
    "docs/prd.md",
    "docs/stories.md",
    "docs/architecture.md",
    "docs/design-system.md",
    "docs/theming.md",
  ]
  if (framingDocs.includes(p)) return false

  // ── Dotfile allow-list — a naive glob copy drops these ──────────────────
  const dotfileAllowlist = [
    ".gitignore",
    ".dockerignore",
    ".prettierignore",
    ".prettierrc.json",
    ".nvmrc",
  ]
  if (dotfileAllowlist.includes(p)) return true

  // .husky/ contents
  if (p === ".husky" || p.startsWith(".husky/")) return true

  // .env.local.example — placeholder env (explicitly allowed)
  if (p === ".env.local.example") return true

  // ── Default: allow ──────────────────────────────────────────────────────
  return true
}

// ---------------------------------------------------------------------------
// Imperative shell — guarded by import.meta.url so importing for tests is
// side-effect-free.
// ---------------------------------------------------------------------------

/**
 * @param {string} name  Validated project slug
 * @param {string} root  Absolute path to the ui-starter repo root
 */
function scaffold(name, root) {
  const parent = dirname(root)
  const target = join(parent, name)

  // Refuse if target already exists
  if (existsSync(target)) {
    console.error(`✗ Directory already exists: ${target}`)
    console.error("  Choose a different name or remove the directory first.")
    process.exit(1)
  }

  console.log(`→ Scaffolding "${name}" into ${target} …`)

  // ── 1. Copy the ui-starter tree (filtered) ───────────────────────────────
  mkdirSync(target, { recursive: true })
  cpSync(root, target, {
    recursive: true,
    filter: (src) => {
      const rel = relative(root, src)
      // root itself
      if (rel === "") return true
      return shouldInclude(rel)
    },
  })
  console.log("  ✓ ui-starter tree copied")

  // ── 2. Copy the parent .claude/ pipeline ─────────────────────────────────
  const claudeSrc = join(parent, ".claude")
  const claudeDest = join(target, ".claude")
  if (existsSync(claudeSrc)) {
    cpSync(claudeSrc, claudeDest, { recursive: true })
    console.log("  ✓ .claude/ pipeline copied")
  } else {
    console.warn(`  ⚠ .claude/ not found at ${claudeSrc} — skipping`)
  }

  // ── 3. Rewrite package.json name ─────────────────────────────────────────
  const pkgPath = join(target, "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  pkg.name = name
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8")
  console.log(`  ✓ package.json name set to "${name}"`)

  // ── 4. Seed fresh docs/ skeleton ─────────────────────────────────────────
  // docs/decisions/ already arrived via the tree copy.
  // Ensure the pipeline skeleton dirs exist so /ks-status degrades gracefully.
  for (const dir of ["docs/research", "docs/plans", "docs/reviews"]) {
    mkdirSync(join(target, dir), { recursive: true })
    // Keep gitkeep so git tracks the directory
    writeFileSync(join(target, dir, ".gitkeep"), "", "utf8")
  }
  console.log("  ✓ docs/ skeleton seeded")

  // ── 5. git init a FRESH repo + one initial commit ─────────────────────────
  execSync("git init", { cwd: target, stdio: "pipe" })
  execSync("git add -A", { cwd: target, stdio: "pipe" })
  execSync(`git commit -m "init: scaffold from ui-starter"`, {
    cwd: target,
    stdio: "pipe",
  })
  console.log("  ✓ Fresh git repo initialised")

  // ── 6. Next steps ─────────────────────────────────────────────────────────
  console.log("")
  console.log(`✓ "${name}" is ready.`)
  console.log("")
  console.log("Next steps:")
  console.log(`  cd ../${name}`)
  console.log("  npm install")
  console.log("  cp .env.local.example .env.local   # fill in your secrets")
  console.log("  npm run build")
  console.log("")
  console.log("Then start your project pipeline inside the new repo:")
  console.log("  /ks-status")
}

function main() {
  const args = process.argv.slice(2)
  const rawName = args[0]

  if (!rawName) {
    console.error("Usage: node scripts/init.mjs <project-name>")
    console.error("       npm run init <project-name>")
    process.exit(1)
  }

  const slug = slugifyProjectName(rawName)
  if (!isValidProjectName(slug)) {
    console.error(
      `✗ "${rawName}" could not be converted to a valid project name.`,
    )
    console.error(
      "  Names must be lowercase, start with a letter or digit, and contain only [a-z0-9-].",
    )
    process.exit(1)
  }

  const root = dirname(fileURLToPath(import.meta.url))
  // scripts/ is one level below the repo root
  const repoRoot = dirname(root)
  scaffold(slug, repoRoot)
}

// Guard: only run when this module is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
