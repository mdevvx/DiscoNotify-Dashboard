import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next already registers the jsx-a11y plugin; tighten its rules here.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "error",
      "react/no-danger": "error",
      // Snowflakes must never pass through JS numbers (see dashboard-database-contract.md).
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='parseInt'][arguments.0.name=/(guild|channel|role|user|owner|actor)/i]",
          message: "Discord IDs are strings; never parse them into numbers.",
        },
        {
          selector: "CallExpression[callee.name='Number'][arguments.0.name=/(guild|channel|role|owner|actor)Id/i]",
          message: "Discord IDs are strings; never convert them to numbers.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
