# Individual student foundation

## Delivered locally

- Independent student records use `account_type = INDIVIDUAL` with no college, department, or batch. Existing records retain `COLLEGE` and their associations.
- Public registration explicitly offers individual accounts. The unified login sends students without a student record to `/student/setup` to choose independent registration explicitly.
- Self-onboarding is a session-authenticated RPC with no target-user parameter. It checks email confirmation and an active STUDENT profile, preserves existing college students, refuses active college memberships without a student record, and serializes repeated requests through a profile row lock.
- The student dashboard routes missing profiles to setup instead of displaying dead-end links. My Learning uses the same setup flow.
- `/programme` displays the stored offer; `/admin/programme` allows active Super Admins to change the price and duration. Initial terms are INR 500, one-time, six months. No automatic renewal.
- Purchase-record schema stores agreed terms independently of current settings. Client roles cannot create or activate purchases; immutable terms and activated dates cannot be rewritten by subsequent updates.
- Checkout is unavailable. No purchase, paid access, enrollment, or payment is created by registering.
- Profile role/status and student membership fields are protected from self-service privilege changes. Repeated signup no longer overwrites existing profile roles.
- Unified login separates individual students, college students, college administrators, trainers and Super Admins. Employer access is marked coming soon. The selected option never grants a role; server-side checks use the saved account role and student type.
- Individual dashboard and My Learning now show purchase status, agreed terms and access dates in IST. Active access takes precedence over newer failed/pending orders. Expiry is exclusive; future activation is shown separately. Database/network failures show unavailable instead of claiming the student has not paid. College students do not query or display this panel.
- This panel is informational: it does not activate access, create enrolments, collect payment, or enforce a content paywall. No additional migration is needed for the panel after 006.

## Apply the database change

1. In the project's Supabase SQL Editor, run the whole `supabase/migrations/006_individual_student_foundation.sql` file once, after migrations 001–005. It runs inside a transaction.
2. Do not rerun migrations 001–005. Migration 006 is a one-time migration, not an idempotent seed.
3. If SQL reports an error, keep the exact error and do not continue onboarding until it is resolved.
4. For local email confirmation, keep Supabase Authentication → URL Configuration aligned with the local server URL (currently `http://localhost:3002`). Existing `.env.local` APP_URL settings also affect password resets. No email URL or session callback changes were included here.

The migration has been reviewed against repository schemas but has NOT been executed against hosted Supabase or a local PostgreSQL instance by the coding agent. Hosted policies/schema may differ; database behavior still needs verification.

## Acceptance checks after migration

1. Log in with the existing unlinked STUDENT test account. The dashboard should show Complete your student profile. Choose Create my individual student profile only if this account is intended to join independently.
2. Verify its student row has INDIVIDUAL type and null college/department/batch. Repeat the setup request: there must still be one row for that user.
3. Verify My Skills opens with unassessed skills for a new account; no other student's scores or history should appear. Learning/assessments may be empty because no courses have been purchased or assigned.
4. Log in as an existing college student. Confirm its student ID, college, enrollments, and learning flow remain unchanged.
5. As Super Admin, open Individual Programme Settings. Confirm INR 500 and six months, change the offer, verify `/programme`, and restore the test offer if desired.
6. Using an authenticated non-admin session (not the SQL Editor's default postgres role), verify programme-setting writes and direct purchase writes are denied. Verify profile role changes and student affiliation changes are denied.
7. Test confirmed new signup, repeated signup, unconfirmed signup, missing profile recovery, and simultaneous setup submissions. Check existing privileged accounts are not downgraded.

## Local verification

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed.
- `node tests/individual-programme.cjs`: 24 checks passed.
- `node tests/skills-dashboard.cjs`: 15 regression checks passed.
- Tests cover input validation, action-level authorization/scoping, repeated-signup behavior, redirects, and existing skill presentation with mocked clients. They do not prove live database policy behavior.
- The user reported applying migration 006 and confirmed the individual programme page and isolated new-student skill display. Administrator pricing checks are deferred until the user selects a Super Admin account.
- Unified login choices were checked in the browser; `node tests/login-portals.cjs` passed 15 mocked authorization checks.
- `node tests/programme-access.cjs` passed 12 status and session-scoping checks. Paid/expired states use fixtures, not real payments. Live authenticated verification of the new status panel is still required.

## Next stage — required before taking payments

Select and connect a payment provider, define the programme course catalogue, build server-created checkout orders and verified idempotent payment callbacks, grant enrollments only after verified payment, enforce access expiry at the database and server layers, handle failed/refunded/duplicate payments, and implement/test session restrictions.

Existing course/lesson database policies are broader than a paid-content model requires. A page-level paywall alone would be insufficient. This foundation must not be presented as an operational payment gate, subscription service, or account-sharing prevention system.

Employer accounts are outside this change. Overall employability scoring remains deferred.
