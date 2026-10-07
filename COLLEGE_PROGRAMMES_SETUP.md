# College programme access

Apply `supabase/migrations/041_college_programmes.sql` in the Supabase SQL Editor after migrations 001–040. It can be rerun without clearing selections. This migration has been tested locally; it is not applied to your hosted project automatically.

1. Sign in as College Admin and open **Programs**.
2. Select the college if your account manages more than one.
3. Search skills by name or description. Select individual skills, or **Select all currently available skills**, then uncheck any that belong to other programmes.
4. Save programme access. It applies across the college's departments and batches, including current active students and students who join later.

Filtering only changes what the administrator sees, not what is selected. Select all includes the current catalog even when filtered. Newly added skills remain unselected until explicitly selected and saved. Published modules and lessons within a selected skill become available automatically; draft material remains hidden.

Existing colleges retain their previous access until the first save. Removing a skill hides its material without deleting progress, results or enrolment history. Saves are blocked while a student has an assessment in progress. Admins can configure only colleges they manage.

This screen configures the college's Campus-to-Corporate programme. The shared skill library can contain skills intended for other programmes; creating and assigning multiple named programmes is not part of this change.

Before inviting a pilot cohort, save the selection, sign in with a test college student, verify a selected lesson and its assessment, and confirm an unselected skill is unavailable. Add a new test skill and confirm it appears unselected in Programs. Then explicitly select it and verify access. Run this acceptance check on the hosted deployment too.
