// Flat ESLint config for Next 16 (eslint-config-next 16 ships native flat
// configs — import + spread them directly; no FlatCompat needed).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  // Don't lint generated output or deps.
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Allow intentionally-unused args/vars when prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // React Compiler (react-hooks v6) is over-strict here: it flags legitimate
      // external-sync effects (URL↔tab state, mount/exit animation, debounced
      // effects). Keep them visible as warnings instead of hard errors.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]

export default eslintConfig
