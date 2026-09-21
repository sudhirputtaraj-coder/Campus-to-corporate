# College course enrolment

Apply 014_college_course_enrolment.sql in Supabase SQL Editor after 013. The complete
script is safe to rerun. It enables RLS immediately on the college_courses table;
authenticated clients can only read assignments as active Super Admins. Only the
restricted enrolment function writes assignments and enrolments.

In Super Admin → Manage Colleges, open an active college and choose Manage course
enrolment. Choose an active course, review the all-current-students confirmation,
and save. The response reports new and existing enrolments. Students then use
My Learning and Assessments through their existing college student accounts.

Only active COLLEGE student records with active STUDENT profiles at this college
are eligible. Independent students, staff, suspended accounts and other colleges
are excluded. Existing enrolment status, dates and progress are never reset,
including completed or cancelled enrolments. Repeating the action enrols newly
joined students. New students are not automatically enrolled on joining.

A college can have an assigned course even when no students are eligible yet.
This workflow does not revoke assignments, change paid individual entitlement,
or give college administrators this bulk-assignment control. It records an audit
entry and saves the assignment and enrolments in one database transaction.

Validate with tests/college-courses.cjs, tests/payment-database.cjs and TypeScript.
After applying the hosted migration, use a test college/student to verify My
Learning and assessment visibility. The automated checks use an isolated database.
