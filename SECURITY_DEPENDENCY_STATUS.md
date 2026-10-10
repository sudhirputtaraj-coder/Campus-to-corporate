# Dependency security update — 8 October 2026

Updated Next.js and eslint-config-next from 15.5.26 to 15.5.27. Compatible lockfile updates include Sharp 0.35.5, source-map-js 1.2.2, and brace-expansion fixes.

`npm audit --omit=dev` reports zero known vulnerabilities after these updates. This is a dependency audit, not a guarantee that the application or hosted deployment is free of security issues.

The complete dependency audit still reports 9 findings (7 high, 2 moderate), in the development dependency chains for braces, Tailwind, ESLint tooling and postcss-selector-parser. The npm registry's latest braces release remains 3.0.3 and is affected. npm's force-fix suggestion includes a breaking Tailwind upgrade and an ESLint configuration downgrade; those were not applied automatically. The full audit CI gate remains enabled and will continue to fail until these findings are resolved. A reviewed development-tool migration or upstream patch is still required before declaring the full audit clean.

Restart the local development server to load the updated Next.js/native compiler. The running server may retain the old native binary until restarted. An old locked compiler cleanup warning during installation did not prevent the new version being installed.

No database migration, hosted configuration change, email sending, or deployment is part of this dependency update. Public deployment and signed-in pilot acceptance remain separate outstanding checks.

Validation after the update: TypeScript check, all 54 test scripts, and production build passed. The build retains existing lint warnings. The complete npm audit still reports the development-tool findings above.
