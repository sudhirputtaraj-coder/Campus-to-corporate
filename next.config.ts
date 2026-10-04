import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function config(phase: string): NextConfig {
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // A running dev server must not overwrite production build artifacts.
    distDir: development ? '.next' : '.next-build',
    typescript: { tsconfigPath: development ? 'tsconfig.json' : 'tsconfig.build.json' },
    // The parent directory contains a separate project and lockfile.
    outputFileTracingRoot: __dirname,
  };
}
