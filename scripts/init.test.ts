/**
 * Unit tests for scripts/init.mjs — pure functions only.
 * The entry-guard (`import.meta.url` check) ensures importing the module
 * has NO side effects (no scaffolding, no fs writes).
 */
import { describe, it, expect } from "vitest"
import {
  isValidProjectName,
  slugifyProjectName,
  shouldInclude,
} from "./init.mjs"

// ---------------------------------------------------------------------------
// isValidProjectName
// ---------------------------------------------------------------------------
describe("isValidProjectName", () => {
  it("accepts a simple lowercase slug", () => {
    expect(isValidProjectName("my-app")).toBe(true)
  })

  it("accepts a slug with digits", () => {
    expect(isValidProjectName("saas2")).toBe(true)
  })

  it("accepts a longer valid name", () => {
    expect(isValidProjectName("my-new-saas-project")).toBe(true)
  })

  it("rejects an empty string", () => {
    expect(isValidProjectName("")).toBe(false)
  })

  it("rejects whitespace-only string", () => {
    expect(isValidProjectName("   ")).toBe(false)
  })

  it("rejects a name with uppercase letters", () => {
    expect(isValidProjectName("My App")).toBe(false)
  })

  it("rejects a name with uppercase (UPPER)", () => {
    expect(isValidProjectName("UPPER")).toBe(false)
  })

  it("rejects path traversal (../evil)", () => {
    expect(isValidProjectName("../evil")).toBe(false)
  })

  it("rejects a path with forward slash (a/b)", () => {
    expect(isValidProjectName("a/b")).toBe(false)
  })

  it("rejects a leading dot (.hidden)", () => {
    expect(isValidProjectName(".hidden")).toBe(false)
  })

  it("rejects a name with spaces", () => {
    expect(isValidProjectName("my app")).toBe(false)
  })

  it("rejects a name starting with a hyphen", () => {
    expect(isValidProjectName("-bad")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// slugifyProjectName
// ---------------------------------------------------------------------------
describe("slugifyProjectName", () => {
  it('converts "My New SaaS" to "my-new-saas"', () => {
    expect(slugifyProjectName("My New SaaS")).toBe("my-new-saas")
  })

  it("converts underscores to hyphens", () => {
    expect(slugifyProjectName("my_project")).toBe("my-project")
  })

  it("lowercases the input", () => {
    expect(slugifyProjectName("UPPER")).toBe("upper")
  })

  it("collapses consecutive hyphens", () => {
    expect(slugifyProjectName("my--double")).toBe("my-double")
  })

  it("strips disallowed characters", () => {
    expect(slugifyProjectName("hello@world!")).toBe("helloworld")
  })

  it("result always satisfies isValidProjectName", () => {
    const inputs = ["My New SaaS", "Hello World", "saas123", "  my app  "]
    for (const input of inputs) {
      const slug = slugifyProjectName(input)
      expect(isValidProjectName(slug)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// shouldInclude — exclude list
// ---------------------------------------------------------------------------
describe("shouldInclude — excluded paths", () => {
  it("excludes .git/config", () => {
    expect(shouldInclude(".git/config")).toBe(false)
  })

  it("excludes .git directory itself", () => {
    expect(shouldInclude(".git")).toBe(false)
  })

  it("excludes node_modules/x", () => {
    expect(shouldInclude("node_modules/some-package/index.js")).toBe(false)
  })

  it("excludes .next/x", () => {
    expect(shouldInclude(".next/server/app/page.js")).toBe(false)
  })

  it("excludes dist/x", () => {
    expect(shouldInclude("dist/bundle.js")).toBe(false)
  })

  it("excludes tsconfig.tsbuildinfo", () => {
    expect(shouldInclude("tsconfig.tsbuildinfo")).toBe(false)
  })

  it("excludes any *.tsbuildinfo file", () => {
    expect(shouldInclude("other.tsbuildinfo")).toBe(false)
  })

  it("excludes coverage/x", () => {
    expect(shouldInclude("coverage/lcov.info")).toBe(false)
  })

  it("excludes .turbo/x", () => {
    expect(shouldInclude(".turbo/cache")).toBe(false)
  })

  it("excludes *.log files", () => {
    expect(shouldInclude("foo.log")).toBe(false)
  })

  it("excludes npm-debug.log", () => {
    expect(shouldInclude("npm-debug.log")).toBe(false)
  })

  it("excludes .DS_Store", () => {
    expect(shouldInclude(".DS_Store")).toBe(false)
  })

  // The critical AC4 secret exclusion
  it("excludes .env.local (real secrets)", () => {
    expect(shouldInclude(".env.local")).toBe(false)
  })

  // docs/ story history exclusions
  it("excludes docs/plans/s01-base-fork.md", () => {
    expect(shouldInclude("docs/plans/s01-base-fork.md")).toBe(false)
  })

  it("excludes docs/research/s01-base-fork.md", () => {
    expect(shouldInclude("docs/research/s01-base-fork.md")).toBe(false)
  })

  it("excludes docs/reviews/s01-base-fork.md", () => {
    expect(shouldInclude("docs/reviews/s01-base-fork.md")).toBe(false)
  })

  it("excludes docs/plans/ directory", () => {
    expect(shouldInclude("docs/plans/s09-init-command.md")).toBe(false)
  })

  it("excludes docs/research/ directory", () => {
    expect(shouldInclude("docs/research/s09-init-command.md")).toBe(false)
  })

  it("excludes docs/reviews/ directory", () => {
    expect(shouldInclude("docs/reviews/s09-init-command.md")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// shouldInclude — include list
// ---------------------------------------------------------------------------
describe("shouldInclude — included paths", () => {
  it("includes .gitignore", () => {
    expect(shouldInclude(".gitignore")).toBe(true)
  })

  it("includes .dockerignore", () => {
    expect(shouldInclude(".dockerignore")).toBe(true)
  })

  it("includes .prettierignore", () => {
    expect(shouldInclude(".prettierignore")).toBe(true)
  })

  it("includes .prettierrc.json", () => {
    expect(shouldInclude(".prettierrc.json")).toBe(true)
  })

  it("includes .nvmrc", () => {
    expect(shouldInclude(".nvmrc")).toBe(true)
  })

  it("includes .husky/pre-commit", () => {
    expect(shouldInclude(".husky/pre-commit")).toBe(true)
  })

  // The critical AC4 example env inclusion
  it("includes .env.local.example (NOT the secret file)", () => {
    expect(shouldInclude(".env.local.example")).toBe(true)
  })

  // docs/decisions/ must be kept
  it("includes docs/decisions/001-boilerplate-fork-applyzi.md", () => {
    expect(
      shouldInclude("docs/decisions/001-boilerplate-fork-applyzi.md"),
    ).toBe(true)
  })

  it("includes docs/decisions/ directory", () => {
    expect(shouldInclude("docs/decisions/002-design-tokens.md")).toBe(true)
  })

  // Normal source files should be included
  it("includes package.json", () => {
    expect(shouldInclude("package.json")).toBe(true)
  })

  it("includes app/globals.css", () => {
    expect(shouldInclude("app/globals.css")).toBe(true)
  })

  it("includes components/brand/logo.tsx", () => {
    expect(shouldInclude("components/brand/logo.tsx")).toBe(true)
  })

  it("includes templates/ directory", () => {
    expect(shouldInclude("templates/story.md")).toBe(true)
  })

  it("includes AGENTS.md", () => {
    expect(shouldInclude("AGENTS.md")).toBe(true)
  })
})
