# Employer and trainer access

## Apply database changes

Apply each complete file as a **separate SQL Editor run**, in this order:

1. `supabase/migrations/023_employer_role.sql` — adds EMPLOYER to the role enum. This must finish/commit before the next script.
2. `supabase/migrations/024_professional_access.sql` — approved account setup, company profiles, trainer assignment controls and scoped progress.
3. `supabase/migrations/025_employer_jobs.sql` — job posts and aggregate college readiness reporting.

The scripts are rerunnable and preserve existing assignments, jobs and learning history. The new functionality depends on the existing foundation through migration 015. It does not invent or replace the previously missing Phase 3 scoring schema. Migration 024 revokes direct authenticated trainer/assignment writes, including the old trainer self-update path; assignment changes now use the audited RPC.

## Set up an employer or trainer

1. The person registers a fresh account and confirms their email. They keep their own password; administrators never need to know it.
2. Super Admin opens **Employer & Trainer Access** on the dashboard.
3. Enter the registered email. Choose **Employer** and the company name, or **Trainer** and the participating college. Confirm the person/access and save.
4. The person signs out, opens Login, selects the matching portal and signs in with their existing credentials.

Selecting a login card cannot grant a role. Setup only accepts active, email-confirmed accounts. Existing student college membership, learning records and purchases block conversion and require a separate transfer review. Repeating setup does not reactivate a hidden company/trainer or move a trainer to a different college. One employer account owns one company in this initial release; employer teams and account transfers are not implemented.

## Employer workflow

- Edit the company profile from the employer dashboard.
- Create job requirements with title, location, responsibilities/qualifications/application instructions and a 0–100 employability threshold.
- Save as Draft, Published or Closed; edit existing posts without duplicating them.
- Published posts are visible under **Student → Job opportunities** for active individual and college students. Students follow the employer's written application instructions. There is no in-platform application submission or CV sharing in this release.
- **View matching college counts** opens the report using that job's threshold. Employers can also change the threshold manually.

The report contains college names/codes, active student counts, measured student counts, counts meeting the threshold and the newest valid measurement date. It includes only active college students with active STUDENT accounts at active colleges. Individual students are excluded from college totals. The latest stored measurement for each student is used; provisional/missing/invalid scores do not qualify. Valid zero scores are measured, not treated as missing. Results paginate 25 colleges at a time. This is a score filter, not a job-fit prediction or hiring guarantee. It does not filter by particular technical skills, qualification, graduation year or student availability. No student names, IDs, contact data or individual scores are returned to employers.

`student_employability_scores` from Phase 3 must exist with `id`, `student_id`, `score`, `is_provisional` and `computed_at`. If absent or structurally incompatible, the report explicitly says reporting is not configured. It does not substitute zeros or fabricated scores. The source of the Phase 3 calculation/RLS still needs reconciliation with GitHub; do not claim production scoring has been verified by this change. The report reflects stored measurements, not an automatic recomputation.

## Trainer workflow

- After Super Admin approval, the college administrator opens **Trainers** from the college dashboard. Super Admin can also manage assignments.
- Assign only batches belonging to the trainer's college; set an assignment to Inactive to revoke it. No trainer can assign themselves, change their own college, or access another college's students.
- Trainer signs in, sees their assigned batches and opens a batch to view active students, course counts, average course completion and number of graded attempts. Lists paginate 25 students at a time.
- Attendance, manual grading, activities and editing course content remain outside this release.

The management screen shows 25 trainers per page and up to 1,000 batches/assignments. Larger catalogues need a searchable assignment picker before rollout at that scale. Profile suspension can be managed through existing Super Admin user management. Active trainer/profile/college/batch and same-college assignment checks gate student progress on every request.

## Validation and release checks

- TypeScript and portal routing tests; isolated PostgreSQL tests in `tests/professional-database.cjs` (PGlite path as first argument).
- Tests cover unauthorized promotions, protected roles, transfer restrictions, cross-college assignment, revoked/suspended access, company isolation, draft/published/closed job visibility, zero/provisional score handling, aggregate-only output and safe reruns.
- The test creates a minimal Phase 3 score table solely as a fixture; it is not a production scoring migration.
- After applying the scripts, test with designated employer and trainer accounts. Verify a job becomes visible to a student, closes correctly, and a revoked trainer assignment cannot reopen progress. Hosted account setup and real scoring data have not been exercised by these isolated tests.
