# Readiness release setup — 24 September 2026

Scope update: employer access now provides aggregate college readiness only. Job posting and student applications have been retired by migration 031. This supersedes the earlier application workflow.

This update covers the five agreed development areas. Hosted acceptance checks and a production build remain release gates; this is not a declaration that the platform is ready for public launch.

## Apply the database updates

Migration 027 has already been reported as successfully applied. In Supabase SQL Editor, run each complete file separately, in this order:

1. `supabase/migrations/028_scoring_foundation.sql`
2. `supabase/migrations/029_job_applications.sql`
3. `supabase/migrations/030_learning_workflows.sql`
4. `supabase/migrations/031_employer_readiness_only.sql`

Migrations 028–030 have since been reported successfully applied. Only 031 remains for the revised employer scope. Do not rerun 025 or 029 after 031: those older migrations grant access to the retired endpoints.

Do not paste fragments or duplicate CREATE FUNCTION declarations. Each migration is transactional and was tested for repeat application in an isolated PostgreSQL database. Stop and retain the error if a hosted migration fails.

A read-only schema check found scoring tables and configuration already present in the hosted project. Migration 028 brings their foundation into source control, preserves existing configuration and history, and replaces the scoring RPC with the documented implementation. It does not recover the original hosted function body.

Restart the development server after applying the SQL: stop the existing server with Ctrl+C, then run `npm run dev` and use the port printed by that command.

## What changed

### 1. Dependencies and automated checks

- Next.js and eslint-config-next 15.5.26, React/React DOM 19.3.0 and PostCSS 8.5.28.
- ESLint configuration adapted to the Next 15 configuration format.
- Dependency audit returned zero known vulnerabilities at validation time. This is not a guarantee against undisclosed issues.
- The Next.js maintainers announced another security release for 30 September 2026. Recheck and apply it before launch: https://nextjs.org/blog.
- Repository scripts: `npm run typecheck`, `npm test`, `npm run build`. GitHub Actions runs these and an audit after a push; no GitHub run has been claimed here.

### 2. Employability scoring

- Uses valid snapshots from graded, formal assessments belonging to the student.
- All active, positively weighted skills must have valid evidence and configured weights must total 100 for a final score. Partial evidence is marked provisional.
- A genuine zero is included. No evidence is displayed as not assessed.
- Unchanged recomputation does not create duplicate score history. Successful skill processing refreshes employability.
- Students cannot directly forge the cached score. Students can recompute their own score; college administrators their college's students; Super Admin permitted students. Employers cannot invoke this operation or read private score histories.

### 3. Student learning and access

- Dashboard checklist links profile, programme access, learning, assessments, employability and jobs. Existing course resume links are retained.
- Active individual access shows an expiry notice during its final 14 days. This is an in-platform notice, not an email or WhatsApp message.
- Super Admin > Individual Programme Settings can select an individual student with an existing free-access grant and extend it by 1–12 months. The action is audited and requires confirmation. This does not change paid purchases or automatically renew access.

### 4. College reporting

- Admin and college analytics support college, department, batch, course and date filters with aggregate CSV export.
- Date filters cover enrolment creation, completed assessment attempts and latest score measurements within the chosen window. Current cohort membership and course progress are current values, not historical snapshots.
- The support list identifies active college students with no enrolments or average progress below a threshold. It uses current college/batch scope, not the report's date or course filters.
- Filter pickers currently load up to 1,000 options per category. Report totals aggregate the full authorised scope.

### 5. Employer college readiness

- Employers compare college-level counts using a minimum employability score (default 70%, adjustable).
- Qualifying students must have a latest final, non-provisional score at or above the threshold. An older final score is not substituted when the latest is provisional.
- Percentage = qualifying students / all active college students × 100. Students without final scores remain in the denominator and are shown separately. Empty colleges show percentage unavailable.
- No student names, emails or individual score histories are shared. A score threshold supports college comparison; it does not guarantee suitability for a job.
- Job posting, student job discovery and applications have been removed from navigation and forms. Bookmarked routes redirect to the appropriate dashboard or readiness report.
- Migration 031 revokes application-role access to old job/application tables and RPCs. Existing historical records remain available for owner/service-role maintenance; no records are deleted. Existing RLS remains enabled.

## Validation and remaining acceptance checks

All 26 regression scripts passed, including 42 new database workflow checks covering role restrictions, scoring, applications, deadlines, report filters, support lists and access extensions. Additional filter/date and CSV formula-escaping tests passed. TypeScript and whitespace checks passed. Source lint completed with zero errors and 63 warnings. The existing explicit-any typing debt is configured as warnings while incomplete Supabase schema types are addressed; the new reporting and application pages use explicit result types. Database tests use isolated PGlite and mocks, not real signed-in student accounts.

After applying the migrations, check these with real accounts without sharing passwords:

1. Super Admin: configure scoring weights totaling 100; inspect analytics; extend an existing test free-access grant.
2. College administrator: filter reports and export CSV; open the support list; confirm another college is inaccessible.
3. College student: complete a mapped formal assessment, inspect the score and confirm the student dashboard has no job/application links.
4. Individual student: check access status and expiry notice, course resume.
5. Employer: open Compare college readiness. Check the active-student count, final-score count, qualifying count and percentage. Change the threshold and verify the count changes appropriately; confirm no applicant details or posting controls appear.

The user supplied a successful local production build for the 028–030 release: compilation, type validation, all 47 static pages and optimization completed. The revised employer scope adds 7 focused application tests and expands the database workflow suite to 65 checks, all passing. Run the production build again before deploying the scope change.

Payment-provider activation, WhatsApp-provider setup, approved messaging templates, production hosting/domain configuration and real-account acceptance remain separate launch tasks. No live payment, outbound message, hosted migration or Git push was performed by this update.
