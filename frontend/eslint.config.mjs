import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app is a client-rendered SPA talking to an external REST API
      // (no Next.js server data layer), so "fetch in an effect, setState
      // after await" is the correct pattern throughout. The React Compiler
      // diagnostic behind this rule flags setState calls made from a named
      // async function invoked in an effect even when the setState only
      // happens after an `await` (i.e. not actually synchronous within the
      // effect), so it produces false positives for this pattern rather
      // than catching a real cascading-render bug.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
