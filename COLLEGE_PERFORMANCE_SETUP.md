# College performance reporting

## Activate

1. Run the entire `supabase/migrations/034_college_performance.sql` file in the Supabase SQL Editor, after the existing migrations through 033. It creates one read-only function; it does not create tables or disable RLS. Re-running it replaces the function without deleting records.
2. Start the local app using `npm run dev` and use the localhost port printed by that command.
3. Sign in using **College administrator**, with an active membership of an active college.
4. Open **Dashboard** or **Employability Reports**. A missing migration or failed query shows an unavailable message, never fabricated zero totals.

## Navigation and reports

Desktop and mobile use the same sequence: Dashboard, Departments, Batches, Students, Courses & Enrolment, Employability Reports, Students Needing Support, Trainers.

Reports contain college, department, batch and course filters; score/assessment dates; a readiness benchmark; and student search. Department and batch group links lead to more detailed reports or students, retaining the course/date/benchmark filters. Students can be searched by name or register number. Individual performance includes weighted skill evidence, targets and gaps, score history, formal assessment results and current course progress.

The report includes only active college students with active student accounts at active colleges. Independent students are excluded even when a Super Admin previews the college report. Aggregate counts cover all matching students. Identifiable student lists are paginated, with college scope enforced inside the database function as well as by the existing student detail access checks and RLS.

## Meaning of the numbers

- **Average final score / 100:** average of final scores. Genuine zero scores count; missing and provisional scores do not.
- **Assessment coverage:** students with final scores divided by all active students in the selected cohort.
- **Ready / all:** final scores meeting the report benchmark divided by all active students in the selected cohort.
- **Ready / assessed:** final scores meeting the benchmark divided by students with final scores.
- **Provisional:** latest score requires additional evidence or scoring configuration review. No fallback to an older final score.
- **No measurement in period:** no latest score eligible for the selected date range. This is not a zero score or proof that the student has never been assessed.

The initial benchmark comes from the active `PLACEMENT_READY` classification minimum. A report override changes the comparison only, not stored scoring rules or classifications. If this classification is disabled, enter an explicit report benchmark. Empty denominators display a dash.

Dates select the latest employability measurement up to the end date, excluding it if older than the start date. They also filter formal assessment completion dates. Membership, enrolment and progress are current, not historical snapshots. A course filter identifies enrolled students; overall employability scores remain across skills, not attributable to one course.

Course assessment averages use the latest graded formal attempt per student and assessment in the period; practice attempts are excluded. The unit is a student-assessment result, not a unique student. Pass rate uses results with a recorded pass/fail decision. Individual details show all matching graded formal attempts, paginated. Score history is descriptive and does not establish that training caused improvement.

The support list includes students with no final score, provisional scores, scores below the chosen benchmark, positive skill gaps, no active/completed enrolment or average course progress below 40%. All report filters are retained. This is a review list; assigning staff, deadlines and tracking interventions are not included in this change.

CSV exports contain aggregate group and course performance, filter context and generation time; no individual student identities.

## Validation and manual acceptance

Automated checks run against an isolated PostgreSQL database, never hosted Supabase. They cover two-college isolation, denied roles, suspended administrators, revoked membership, underlying detail RLS, combined filters, date boundaries, zero/provisional/unmeasured scores, course attempt selection and cohorts exceeding 1,000 students. UI/helper tests verify denominator labels and filter preservation.

After applying the migration, confirm with two real college-admin accounts and representative test students:

1. Each account sees only its own college data, including on a copied student URL from the other college.
2. A department and batch with both assessed and unassessed students show correct totals and readiness percentages.
3. Clicking a batch or course opens the expected students; opening a student and returning retains report filters.
4. Final, provisional, missing and zero scores have distinct displays.
5. Completing a course with a weak assessment result still places the student in the support list.
6. CSV values match the report; mobile tables scroll within their panels.

Hosted migration execution and these signed-in browser checks require the running app and configured college data. Automated checks do not replace that acceptance test.
