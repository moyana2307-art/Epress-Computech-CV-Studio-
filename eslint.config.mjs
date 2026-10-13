import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // We load data from the API inside useEffect and set the result into
      // state. That is a normal, SSR-safe pattern for this app, but the new
      // Next.js rule flags it. Turn the rule off here.
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
    // Backend uses plain CommonJS; it is linted separately if needed.
    "backend/**",
  ]),
]);

export default eslintConfig;
