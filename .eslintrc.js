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
      "error",
      "unix"
    ],
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
    "no-useless-escape": "off"
  },
  globals: {
    "__": true,
    "__VERSION__": true,
    "__NAME__": true
  }
};