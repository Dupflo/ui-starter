import { describe, it, expect } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
  it("concatène des classes simples", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("ignore les valeurs falsy (conditionnel via clsx)", () => {
    expect(cn("px-2", false, null, undefined, "py-1")).toBe("px-2 py-1")
  })

  it("résout les conflits Tailwind (tailwind-merge garde le dernier)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
