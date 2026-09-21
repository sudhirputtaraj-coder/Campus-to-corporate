# Departments, batches and student placement

Apply the complete 015_college_structure.sql script in Supabase SQL Editor after
014. It is safe to rerun and creates no new tables. Its restricted function checks
the active administrator, college scope and related records before saving.

1. College Dashboard → Departments: select your college, add a department with a
   unique code, or open an existing department to edit its name/code/status.
2. Batches: add a named batch, optionally select a department and academic year.
   A batch's department is fixed after creation; create another batch if needed.
3. Students & Progress: open an active student and expand Assign department and
   batch. Select matching records and save. No department/no batch clears placement.
4. Courses / Enroll: use the existing batch course enrolment control. Placement
   alone does not automatically enrol students in any course.

Inactive departments cannot receive new batches or placements. Reactivate a
department before editing a batch attached to it. Inactive batches cannot receive
new placements. Existing enrolments, assessment history and course progress remain
unchanged when placement changes. Existing students/batches are not deleted when
a department is marked inactive. No CSV import or trainer management is included.

Validation: TypeScript, college student tests, structure action tests, and isolated
database tests for access restrictions, duplicate codes, valid placement, mismatched
departments, foreign-college access, historical preservation and repeat migration.
