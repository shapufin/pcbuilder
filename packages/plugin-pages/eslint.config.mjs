import tseslint from 'typescript-eslint'

const boundary =
  'Plugin boundary: plugin-pages must not import sibling plugins or the app (05-plugin-contracts.md rule 5). Consume collections via soft references or payload events instead.'

export default tseslint.config(
  { ignores: ['node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // House style uses explicit `as` casts instead of any-typed params.
      '@typescript-eslint/no-explicit-any': 'off',
      // Entry 19 (Phase 5 Step B), review round: no-restricted-imports only sees
      // static imports — cover `await import(...)` too (require() is dead in ESM).
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportExpression Literal[value=/@buildmyrig\\/plugin-shop/]', message: boundary },
        { selector: 'ImportExpression Literal[value=/@buildmyrig\\/plugin-pc-builder/]', message: boundary },
        { selector: 'ImportExpression Literal[value=/apps\\/web/]', message: boundary },
        { selector: 'ImportExpression Literal[value=/@buildmyrig\\/web/]', message: boundary },
      ],
    },
  },
)
