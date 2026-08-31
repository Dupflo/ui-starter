import type { UseFormRegisterReturn } from "react-hook-form"

/**
 * `TextField.registration` is a react-hook-form `UseFormRegisterReturn` — a
 * bag of closures (`onChange`/`onBlur`/`ref`), not something meaningfully
 * serialisable as source text. The gallery is a static showcase, not a real
 * form: this stub satisfies the type so `TextField` renders, while the code
 * shown next to it uses the `SnippetPropValue` code-override (see
 * snippet.ts) to display the idiomatic `register("name")` call instead.
 */
export function fakeRegistration(name: string): UseFormRegisterReturn {
  return {
    name,
    onChange: async () => {},
    onBlur: async () => {},
    ref: () => {},
  }
}
