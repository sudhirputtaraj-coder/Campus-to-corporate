import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [
  { ignores: ['.kilo/**', '.next/**', '.next-build/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Existing Supabase queries are not yet backed by complete generated schema types.
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },
  // Node test runners intentionally use CommonJS; keep all other rules enabled.
  { files: ['scripts/**/*.cjs', 'tests/**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
export default config;
