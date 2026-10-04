# Controlled college pilot release checklist

Updated 3 October 2026. Security release 035 is required before pilot acceptance; follow SECURITY_ASSESSMENT_SETUP.md for the coordinated database/application rollout. Start with one college and 10-20 students after the gates below pass. Local automated tests do not establish hosted readiness. Do not rerun old migrations indiscriminately.

## Local release checks

Run from the repository root containing package.json:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
npm run start -- -p 3107
```

Development uses .next. Production build/start use .next-build and tsconfig.build.json, so a running development server cannot replace production artifacts. Both builds retain lint and type validation. The explicit tracing root prevents the separate parent project from being inferred as this application's root. Do not manually point next start at .next. CI includes lint, typecheck, tests, dependency audit and build; a successful local run does not establish a successful GitHub Actions run.

Current source checks: lint passes with 58 pre-existing warnings; typecheck and all 33 regression scripts pass. Dependency audit returned zero known vulnerabilities during this audit. The production build passed with type validation and all 51 page-generation steps. A local production-server smoke check passed: six public pages and the Geist font returned 200; five protected role routes redirected anonymous users to login. Signed-in browser, hosted schema, email, mobile and recovery checks remain pending.

## Database and content gate

Use the intended Supabase project's SQL Editor for read-only inspection first. Keep student names, emails, keys and passwords out of chat and release evidence.

- Compare actual tables, function definitions, RLS policies and grants with migrations through 034. SQL Editor execution may not populate a CLI migration ledger; absence from that ledger alone does not prove a migration was missed.
- Verify 031 revoked authenticated/anonymous access to retired job/application tables and functions. Never rerun 025 or 029 after 031 without reapplying and reviewing the retirement protections.
- Verify 032 lesson practice fields and skill order, 033 usage restrictions, and 034 college-performance function. Function existence alone does not prove the current definition or permissions are correct.
- Confirm every table containing student data has the intended RLS policies. A service-role or SQL-owner query bypasses the very restrictions that signed-in acceptance must test.
- Super Admin: inspect active scoring weights (total 100), final-score classifications, skill evidence thresholds, published formal assessments, question-to-skill mappings and valid answer keys. Each positively weighted skill needs enough assessed evidence for a final score.
- Inspect the actual published learning path, lesson text, embedded videos/links, hidden lessons and course assignments. The handbook import adds self-study content, not formal assessments. Database edits after import can differ from the repository manifest.
- Use representative test students: final, provisional, missing and genuine zero scores. Complete a formal assessment and verify skills/history/report totals; practice must not alter formal scores.

A separate production Supabase project remains a proposal, not an existing resource. If selected, rehearse the repository migrations in filename order on a disposable project, verify schema/configuration/content, and provision authorised accounts. Do not clone experimental student identities or blindly overwrite an existing hosted database.

## Deployment and environment

After approval to publish, import the GitHub repository into Vercel using the Next.js preset. Select the directory containing this package.json as Root Directory; the local Desktop nesting does not imply a nested GitHub root. Use npm ci and npm run build. The application config sets .next-build as production output; verify Vercel's detected output agrees with that configuration. Validate a protected preview before inviting students. Keep preview/test data separate from production data. See [Vercel Next.js deployment documentation](https://vercel.com/docs/frameworks/full-stack/nextjs).

Configure these privately in the target environment:

| Variable | Required value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Intended project's URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Same project's public anon key |
| SUPABASE_SERVICE_ROLE_KEY | Same project's server-only service-role key |
| NEXT_PUBLIC_APP_URL | Exact deployed HTTPS origin, without a path |
| RAZORPAY_TEST_ENABLED | false |
| VOICE_COACH_ENABLED | false |

Leave provider payment and AI credentials unset for the pilot unless separately approved and tested. WhatsApp preferences do not send messages; do not add a provider or claim delivery. Keep a free individual programme option configured if individual access is included in the pilot.

## Authentication and email

Set Supabase Site URL to the deployed HTTPS origin. Allow its /auth/callback** path so the app's fixed next query parameter is supported; avoid broad production-domain wildcards. Confirm the email templates use the generated confirmation URL. Test registration, confirmation, password reset and sign-out on desktop and mobile; PKCE email links must open in the browser that initiated the flow. See [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls).

Configure and verify custom SMTP for real student recipients. Supabase's default sender is restricted and unsuitable for a real-user pilot; check current limits, sender verification and delivery with approved test inboxes. Sending test emails requires explicit authorisation. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Signed-in acceptance record

Use approved test accounts; sign in personally without sharing passwords. Use two test colleges to prove isolation even though the actual pilot has one college. Record pass/fail, date, tester, build commit and sanitised evidence for each row.

| Journey | Required outcome | Status |
| --- | --- | --- |
| College student | Assigned lessons only; completion persists; formal assessment produces expected evidence | Pending |
| Individual student | Free access works; expired access blocks writes but preserves history | Pending |
| College administrator A and B | Each sees own students only; copied foreign student URL is denied | Pending |
| Reporting | Department/batch/course/student views and CSV reconcile with known cohort; both denominators are correct | Pending |
| Employer | Aggregate readiness only; no identities, private histories or retired job/application access | Pending |
| Trainer | Assigned scope only; employer access remains separate | Pending |
| Super Admin | Content/mappings/settings save and preserve existing learning history | Pending |
| Every role | Sign-out works; suspended accounts denied; anonymous protected routes denied | Pending |
| Mobile | Navigation, lessons, tables and account email callbacks usable on Android/iPhone | Pending |

## Operations and launch decision

Assign a support owner and incident contact. Confirm the target project's backup coverage and rehearse a restore to a separate environment before onboarding real students. Backups of database metadata do not substitute for backing up uploaded Storage objects. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Monitor failed logins, failed assessment submissions, unavailable reports and application errors without logging secrets or student response bodies. Record the last working deployment and rollback procedure; an application rollback does not reverse database migrations. No destructive database rollback should be automatic.

Launch only after production build, hosted schema/content review, email tests, signed-in isolation tests and recovery checks pass. Payments, WhatsApp delivery and live AI activation remain deferred.
