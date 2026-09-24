# Platform analytics and role review — 24 September 2026

> Follow-up: migration 027 was reported applied. The five improvement areas below are superseded by READINESS_RELEASE_SETUP.md and migrations 028–030. Hosted scoring was confirmed present through a read-only schema check; the original review described the missing repository foundation.

## Delivered in this review

- Super Admin: new /admin/analytics page and working dashboard/mobile links.
- College Administrator: updated /college/analytics, scoped in the database to permitted active colleges.
- Learning metrics: active individual/college students, enrolled students, enrolments, completed enrolments, average progress per enrolment, graded assessment attempts.
- Employability metrics: final measurements, provisional measurements, missing final measurements, final average, classifications, top ten skill gaps, college/individual cohorts, department and batch averages, and latest measurement time.
- A valid zero score is included. Each student contributes their latest measurement only; if it is provisional, an older score is not substituted. All scoped students are aggregated, removing the previous sampling and API row-limit problem.
- Database errors show an unavailable state. If scoring tables are absent, learning analytics still works and score metrics are explicitly unavailable.
- Suspended administrators and non-finite weight values are rejected by the employability settings action.
- Repaired stale test fixtures and old migration filenames in tests, handbook instructions and import generator. No assessment history, student identity, payment or hosted account was changed.

## Required setup

Copy the entire `supabase/migrations/027_learning_analytics.sql` into Supabase SQL Editor and run it after 026. This adds a read-only reporting RPC, not a replacement scoring algorithm. Then open Super Admin > Platform Analytics or College Administrator > Analytics.

This migration does not create the missing Phase 3 scoring engine. If scoring exists in your hosted database, this report reads its latest measurements. If it does not, the warning is intentional and needs the scoring setup described below.

## What was tested

- All 25 test scripts passed after repairing stale fixtures and migration references. Tests use mocks and isolated PostgreSQL/PGlite, not production student accounts.
- Analytics database checks cover 23 cases including unauthorised roles, college isolation, suspended administrator denial, individual cohorts, zero scores, provisional/latest evidence, enrolment completion, inactive colleges and 1,102 students in one college.
- Existing role suites cover individual payment/free-access expiry, protected lessons and assessment writes, college membership and enrolment boundaries, employer job ownership and published/draft visibility, employer restrictions on learner identities, trainer batch restrictions, skills evidence, certificates and WhatsApp consent preferences.
- TypeScript validation and diff whitespace checks pass.
- Live local HTTP checks: six public routes returned 200; six protected routes redirected anonymous visitors to login.
- Browser: employer sign-in form and Show/Hide password control worked. The programme page displayed Free, six months and no payment required. At a 390px viewport, login and programme pages had no horizontal overflow; the mobile menu opened.
- Production build attempted in an isolated copy. It stopped with Windows spawn EPERM; no production build pass is claimed.
- Signed-in browser journeys for all roles have NOT been completed. The user chose automated checks first. No account passwords were requested or used, and no account privileges were changed.

## Highest-priority work before public launch

1. **Dependency security update.** npm audit reports 3 affected packages: Next.js (critical), PostCSS (high) and sharp (high). The project is still on Next.js 15.1.0. This reports package findings, not confirmation that every advisory is exploitable in this deployment. Plan a supported dependency update, rerun audit and role tests, then verify a production build. No automatic dependency upgrade was made in this analytics change.
2. **Reproducible employability scoring setup.** Source code calls fn_compute_employability_score and reads student_employability_scores, employability_score_weights and skill_gap_targets, but their creation migrations are absent from this repository. Export/reconcile the hosted scoring definitions, verify permissions and weighting/classification rules, and commit a migration. Do not infer readiness from missing scores. Employer comparisons depend on this.
3. **Authenticated acceptance test.** Use approved accounts for individual student, college student, college administrator and employer. Test the journeys below in the browser after applying 027, including an expired student and a second college. Do not use service-role credentials to simulate a learner session.
4. **Production deployment and email callbacks.** Configure the production HTTPS domain and matching Supabase redirects, test confirmation/reset links on mobile, and complete the production build. Local Wi-Fi links are only development previews. Private LAN addresses currently fall back to the configured auth origin; this can send phone email callbacks to localhost unless the deployed HTTPS configuration is used.
5. **Operational readiness.** Add continuous automated checks, backups with a tested restore procedure, error monitoring and an accountable support contact. This review is not a penetration test or a guarantee that every route is defect-free.

## Role-by-role findings and suggested additions

| Role | Existing journey covered by automated checks/source review | Suggested next improvement |
| --- | --- | --- |
| Individual student | Register/confirm, individual profile, free activation, configured expiry, enrolment, lessons, assessments, skills, certificates | A clearer onboarding checklist and Resume learning action; expiry reminders and an explicitly approved renewal/extension policy. Free access currently gives one period, not repeat free renewal. |
| College student | Administrator-linked membership, assigned courses, protected lessons/assessments, own skills and certificates | An assessment due-date/calendar view, learning reminders and an obvious way to contact the college placement team. Confirm enough graded assessment coverage exists for all seven skills. |
| College administrator | Own-college students, department/batch placement, enrolments, new analytics | Add cohort/course/date filters, aggregate CSV export and an intervention list for students with low progress or incomplete assessments. Clarify duplicates in department/batch names when an administrator covers multiple colleges. |
| Employer | Approved company access, create/edit draft/published/closed jobs, aggregate college score-threshold comparisons | Structured job fields (qualification, skills, openings, experience, location/work mode, deadline), company verification, and an explicit application/contact-college workflow. Current requirements text supplies application instructions; there is no applicant tracking or shortlist workflow. |
| Super Admin | Account/college/user access management, programme pricing/duration, course/skill management, new analytics | Audit-log viewer, configuration history, platform health reporting and separate navigation for employer and trainer onboarding if operational teams prefer it. Login roles and data permissions are already separate. |

## Deferred integrations and limits

- Razorpay remains test-only/pending merchant finalisation. Free enrolment works independently. Real payments, reconciliation and refund handling need acceptance testing before reopening paid checkout.
- WhatsApp preference/consent storage exists; a messaging provider, verified sender, approved templates and delivery processing are not connected. No WhatsApp messages were sent.
- Responsive website access exists. This is not an installed Android/iOS native app; authenticated mobile and keyboard/screen-reader testing still need completion.
- Resume builder, mock interviews and AI career mentor are visibly future features, not complete learning tools.
- No formal hiring decision or individual student contact information is exposed by the employer readiness totals. Any future candidate profiles/applications should use an explicit student sharing workflow.
- New courses published after a free activation are not automatically added by a background job; students can activate again during their existing period to enrol in current courses without extending expiry. Consider automatic entitlement-to-course synchronisation.

## Browser acceptance checklist

1. Individual: register/confirm, create profile, activate free access, open a course, complete a lesson, submit a formal assessment, verify results/skills/history, verify exact expiry blocks learning writes and leaves historical results accessible.
2. College student: sign in via College student, confirm assigned courses only, submit an assessment, verify personal results, try an unassigned course and a different student's result URL.
3. College administrator: confirm college/batch membership, enrol a batch, open Analytics, reconcile totals against a known cohort and confirm another college is not accessible.
4. Employer: use an approved employer account, save a draft, publish a test job, verify student visibility, close it, compare thresholds (including 0), and confirm another employer's jobs cannot be edited. Verify real scoring setup before interpreting readiness counts.
5. Repeat main navigation and long tables on a phone. Confirm login, reset links and logout work on the production HTTPS domain.

This review changes local source files only. Migration 027 remains for the user to apply; these changes have not been pushed to GitHub in this turn.
