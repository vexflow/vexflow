import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import _import from "eslint-plugin-import";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["**/node_modules/", "tests/qunit/"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
        "simple-import-sort": simpleImportSort,
        import: fixupPluginRules(_import),
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "commonjs",

        parserOptions: {
            project: ["./tsconfig.json", "./tsconfig.tools.json"],
        },
    },

    rules: {
        "no-console": "warn",
        "prettier/prettier": "warn",
        "simple-import-sort/imports": "warn",
        "simple-import-sort/exports": "warn",
        "import/first": "error",
        "import/no-duplicates": "error",
        "import/newline-after-import": "warn",
        camelcase: "warn",
    },
}, ...compat.extends(
    "eslint:recommended",
    "prettier",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
).map(config => ({
    ...config,
    files: ["**/*.ts"],
})), {
    files: ["**/*.ts"],

    rules: {
        "@typescript-eslint/no-inferrable-types": "off",

        "simple-import-sort/imports": ["warn", {
            groups: [
                // Any import that starts with vex goes next.
                ["^.*/vex.*$"],
                // Imports of the index.ts file next.
                ["^.*/index$"],
                // The rest are just the defaults for the eslint-plugin-simple-import-sort plugin:
                // Search for "default groups" here: https://github.com/lydell/eslint-plugin-simple-import-sort
                ["^\\u0000"],
                ["^@?\\w"],
                ["^"],
                ["^\\."]
            ],
        }],
    },
}, ...compat.extends("eslint:recommended", "prettier").map(config => ({
    ...config,
    files: ["**/Gruntfile.js", "{demos,tools}/**/*.{js,cjs,mjs}"],
})), {
    files: ["**/Gruntfile.js", "{demos,tools}/**/*.{js,cjs,mjs}"],

    // Disable some eslint rules in the Gruntfile, demos/*, tools/*.
    rules: {
        "no-console": "off",
        "no-unused-vars": "off",
        "no-undef": "off",
    },
}];