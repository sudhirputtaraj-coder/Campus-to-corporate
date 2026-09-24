import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Existing Supabase queries are not yet backed by complete generated schema types.
  // Keep that typing debt visible while retaining the remaining lint checks.
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },
  { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] },
];
