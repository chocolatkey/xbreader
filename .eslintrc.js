module.exports =  {
  parser:  "@typescript-eslint/parser",
  extends:  [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  plugins: ["@typescript-eslint"],
  parserOptions:  {
    sourceType:  "module",
    project: "./tsconfig.json"
  },
  env: {
    node: true,
    es6: true,
    commonjs: true,
    browser: true
  },
  rules: {
    "linebreak-style": [
      "off",
      "unix"
    ],
    "camelcase": "off",
    "eqeqeq": "error",
    "@typescript-eslint/camelcase": ["off"],
    "@typescript-eslint/class-name-casing": ["off"],
    "no-empty": ["error", {"allowEmptyCatch": true}],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "always"
    ],
    "comma-dangle": [
      "error", 
      "never"
    ],
    "no-console": "off",
    "no-useless-escape": "off",
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/type-annotation-spacing': ["warn", {
      "before": false,
      "after": true
    }]
  },
  globals: {
    "__": true,
    "__VERSION__": true,
    "__NAME__": true
  }
};