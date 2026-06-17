import js from '@eslint/js'
import security from 'eslint-plugin-security'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-child-process': 'off',
    },
  },
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'resources/**'],
  },
)
