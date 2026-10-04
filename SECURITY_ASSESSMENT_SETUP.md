# Security and assessment integrity release (migration 035)

Prepared 3 October 2026. Local code and isolated tests are ready for release verification. The user reported that migration 035 completed in Supabase SQL Editor with "Success. No rows returned". Hosted role and assessment acceptance remains pending; the assistant has not independently verified the hosted schema.

## Behaviour

- Students submit answers through fn_start_assessment and fn_submit_assessment. Direct client writes to attempts/answers, including legacy column grants, are revoked for all authenticated roles. This includes browser Super Admin and trainer sessions; trusted database-owner/service maintenance remains possible.
- Database operations derive student identity from auth.uid, check active status/course access, lock rows, enforce attempt limits and the existing timer plus two-minute grace period, and calculate marks from private answer keys.
- Successful answers, grades, formal skill processing, employability refresh, progress, eligible certificates and the submission audit entry commit together. A processing failure rolls back the submission. Retrying a committed submission returns the saved result without rewriting answers.
- Timeouts persist as SUBMITTED with zero marks and no formal skill processing. Existing PENDING_EVALUATION records are retained; this release does not automatically grade them.
- Questions, answer keys and scoring-related assessment settings are locked after the first attempt. Create a new assessment to change those definitions. Status/title changes remain possible.
- Pilot assessments require 1-200 automatically graded questions, positive marks and nonempty answer keys. Each submitted answer is bounded to 4,000 characters. Written/scenario questions are removed from new-question choices; existing assessments requiring manual marking are blocked with an explanatory message, not deleted.
- College administration scope now requires active profile, correct role, active membership and active college at the database layer.
- Profile emails must match Auth identity on insert and a confirmed Auth email on email changes. Professional provisioning resolves the confirmed Auth email, not the editable legacy profile value. Existing mismatches are not silently rewritten.
- Old duplicate action paths re-export the canonical implementations.

## Rollout order

1. Confirm the intended Supabase project and take/verify a recoverable backup. Run the read-only checks below. Resolve required pilot assessments that have unsupported questions or missing keys. Pause assessment activity for the short release window.
2. Verify migrations through 034 exist in the intended project. Run the complete `supabase/migrations/035_security_assessment_integrity.sql` in SQL Editor as the database owner. It is transactional and tested for repeat application. Do not paste fragments or rerun older migrations to restore removed permissions.
3. Deploy the matching application changes. The old application writes grades directly and will fail after 035; the new application requires the new RPCs. Keep students out until both are installed.
4. Run the hosted acceptance steps below using approved test accounts and an ordinary user session. A service-role test does not prove end-user restrictions.
5. Reopen access only after the checks pass. Keep integrations disabled. Production build, privacy/account protection and operational pilot gates remain in PILOT_RELEASE_CHECKLIST.md.

If deployment fails after SQL: keep assessment activity paused and repair forward. Do not restore the vulnerable student grading grants merely to make the old application work. No automated rollback or historical-score deletion is included.

## Read-only preflight (SQL Editor)

These return aggregate counts or assessment configuration, not student identities/answers:

```sql
-- Existing identity mirrors to reconcile through trusted Auth-based maintenance.
SELECT count(*) AS profile_email_mismatches
FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
WHERE lower(p.email) IS DISTINCT FROM lower(u.email);

-- Required pilot assessments must not appear here.
SELECT a.id, a.title, count(q.id) AS question_count,
       count(q.id) FILTER (WHERE q.question_type NOT IN ('MCQ','MULTIPLE_CHOICE','TRUE_FALSE')
         OR q.correct_answer IS NULL OR btrim(q.correct_answer)='' OR q.marks<=0) AS unsupported_questions
FROM public.assessments a LEFT JOIN public.questions q ON q.assessment_id=a.id
WHERE a.status='ACTIVE'
GROUP BY a.id,a.title
HAVING count(q.id) NOT BETWEEN 1 AND 200
    OR count(q.id) FILTER (WHERE q.question_type NOT IN ('MCQ','MULTIPLE_CHOICE','TRUE_FALSE')
         OR q.correct_answer IS NULL OR btrim(q.correct_answer)='' OR q.marks<=0)>0;

SELECT status, count(*) FROM public.assessment_attempts GROUP BY status;
```

An existing graded record is not retroactively proven trustworthy by this migration. Review historical scores/certificates and any pending written assessments before including them in pilot reports. Do not mass-delete history or blindly reprocess potentially altered marks. Use approved synthetic records or independently verified assessment evidence for initial acceptance.

## Hosted acceptance

- Active student: start/resume, submit wrong and correct responses on separate test assessments, verify grade, skills and report. Retry one completed submission with different answers; the grade must stay unchanged.
- Direct authenticated database requests: attempts/answers INSERT, UPDATE and DELETE must fail, including grade, timestamp, status and marks fields. New RPCs must deny anonymous callers, other roles, foreign attempts and missing/expired entitlement.
- Verify missing/duplicate/foreign/oversized answers do not write anything. Run two tabs and simultaneous submissions against hosted PostgreSQL; only one committed result may exist. PGlite tests demonstrate replay/atomicity but do not substitute for independent PostgreSQL-connection concurrency testing.
- Confirm expiry, suspension and timeout behaviour, and that practice never changes formal evidence. Verify scoring failure recovery in a disposable environment, not by disrupting production functions.
- Suspend a test college admin while preserving its session: direct reads of college students and college writes must be denied. Verify inactive college, role change and membership revocation as well as cross-college access.
- User profile-email spoof must fail; ordinary profile edits and a confirmed Auth email change must still work. Professional setup must select the account owning the confirmed Auth email even if its legacy profile email differs.
- Check retained history, certificate sharing, all-role navigation and mobile assessment submission.

## Local validation

The regression runner discovers tests/security-assessment-database.cjs automatically. It loads all earlier migrations, applies 035 twice, exercises adverse and legitimate paths with synthetic roles/data, and reruns the migration to verify history preservation. There are 44 explicit security/integrity checks, including an injected scoring failure and successful recovery. The full suite now contains 34 scripts. TypeScript passed; final build/lint status is reported in the accompanying handover.

No email was sent, no credentials were requested, and no payment, AI or messaging provider was activated.
