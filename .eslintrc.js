module.exports =  {
  parser:  '@typescript-eslint/parser',
  extends:  [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions:  {
    sourceType:  'module',
  },
  env: {
    browser: true,
    es6: true
  },
  rules: {
    indent: [
      'error',
      4
    ],
    'linebreak-style': [
      'error',
      'windows'
    ],
    'quotes': [
      'error',
      'double'
    ],
    'semi': [
      'error',
      'always'
    ],
    'no-console': 'off',
    'no-useless-escape': 'off'
  },
  globals: {
    '__': true,
    '__VERSION__': true,
    '__NAME__': true
  }
};