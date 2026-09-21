# College student directory and course progress

College Dashboard → Students & Progress lists college students in pages of 25.
Search uses register numbers. Open a student to see college, department, batch,
account/student status, and each enrolled course's completion percentage/status.
Course progress is paginated and is not presented as an assessment score.

Access requires an active College Admin or Super Admin profile. College admins
are explicitly scoped to active COLLEGE_ADMIN memberships as well as database
RLS. No active membership returns no students. Individual students are excluded.
Direct student URLs outside the administrator's scope return not found before
requesting progress. No service-role client is used. Read failures display a retry
screen rather than reporting zero progress. This is a read-only workflow.

No SQL migration is needed. Validation: TypeScript, tests/college-students.cjs and
isolated database policy tests. Manual check: sign in as a college administrator,
open Students & Progress, locate a register number, and verify course completion
against the student's My Learning page. Test a second college's student URL to
confirm that it is unavailable to the first college's administrator.
