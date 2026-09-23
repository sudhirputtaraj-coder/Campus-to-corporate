# Batch enrolment checks

The user confirmed the hosted migration and batch enrolment flow are working.

Apply migration 016_atomic_batch_enrolment.sql after 015. The script is safe to
rerun. College Courses / Enroll now uses one database transaction for enrolments,
the batch assignment and the audit entry. Either all these writes succeed or none do.

Only an active College Admin of the batch's college, or a Super Admin, may use
the batch action. The batch, college and course must be active. College admins
must select a course assigned to their college through the Super Admin's college
course enrolment page. Student and account status must both be active.

Existing enrolments, dates, progress and statuses are preserved. The result shows
new enrolments separately from existing ones. Repeating the action is safe and
can enrol students who joined the batch later. Empty eligible batches are rejected.

The new policy permits active college administrators to read their own college's
course assignment list. This migration does not otherwise replace the existing
enrolment RLS policies. Trainer management remains paused.

Checks: TypeScript, tests/batch-enrolment.cjs and isolated database tests. After
applying the hosted migration, test an assigned course against a batch with an
active student, then repeat to verify the existing count and unchanged progress.
