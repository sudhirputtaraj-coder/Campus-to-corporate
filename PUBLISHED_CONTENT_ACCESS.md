# Published lesson access repair

Apply `supabase/migrations/042_published_programme_content.sql` in Supabase SQL Editor after migration 041, then refresh the student learning page.

The student learning path reads the same module and lesson records as Super Admin, but requires an enrolment in their underlying course. Previously, individual programme activation enrolled students only in courses published at that time. Publishing another course later did not add it to existing individual students. This prevented the newly published Parts of Speech module from appearing.

Migration 042 fills missing enrolments for active individual students with valid free or paid programme access. Subsequent course publication, access activation/renewal, and account reactivation also synchronize enrolments. It preserves existing enrolments, completed progress, content and results, and does not publish drafts or extend programme expiry. The individual programme retains its existing all-active-courses scope.

College students continue to use migration 041's selected skills. In **College Admin → Programs**, select Business Communication (and the other intended skills) and save. A college with no saved programme retains its previous manual enrolments. The migration does not select skills for colleges automatically.

Acceptance check:
1. Open Business Communication as an eligible individual student. Open the new **1. Parts of Speech** module and its published **Part 1: Nouns** lesson.
2. Confirm the expanded lesson text appears through its end; the older Basic Grammar module remains a separate record.
3. Select Business Communication in the test college's Programs and verify the same published lesson with an active college student.
4. Draft lessons should remain absent. Super Admin lists drafts too, so admin and student module counts can legitimately differ.

The isolated database test `node tests/published-programme-content.cjs` verifies full content reads for individual and college students, draft visibility, college skill selection, free and paid access, expired/inactive accounts, publication/renewal synchronization, and preservation of progress on rerun.
