# Prepare and publish content gradually

Apply migration **037_content_publishing.sql** after 036 to enable assessment copying and publication checks. Existing courses, lessons, assessments, enrolments and results keep their current state. New items default to hidden. No content is published by applying this migration.

## Your authoring workflow

1. Sign in as Super Admin → Course Management → Create draft course.
2. Add a draft module and select its parent skill.
3. Select **Write, edit & preview lessons / publish module**. This opens the existing rich lesson editor, including written text, video/reading links and practice Q&A.
4. Add lessons as **Draft / hidden**. Use **Preview current lesson** to inspect the current input before saving. Preview is not a save; edit fields and preview again. Links open separately so you can check them.
5. When a lesson is ready, choose **Published** and save. Publish its module and parent skill as well. Content remains inaccessible until its course is published.
6. Back on the course page, choose **Review & publish**. The course needs at least one published module/lesson. Assign the course to colleges or enrol eligible students using the existing enrolment workflow.
7. Add further modules or lessons as hidden drafts whenever needed, then publish each finished sequence. Students retain their recorded lesson completions. New lessons change the amount of available learning; a previously issued certificate is not revoked automatically.

Editing a published lesson updates the live text immediately. For substantial changes, work in a separate hidden lesson and plan the replacement. This release does not maintain separate unpublished revisions of an already-published lesson. Hidden and draft share the existing INACTIVE database status.

## Assessments

New assessments are hidden. Select **Practice only** for quizzes that should not affect skill scores. For formal evidence, map every question to an active skill and supply at least three questions per measured skill.

Questions must have 2–10 distinct choices, a matching answer key and positive marks. Use the edit control on draft questions to correct copied questions. Review the full questions and keys before publishing. A published assessment must be hidden before questions can be edited; attempted assessments remain locked even when hidden.

Use **Create editable draft copy** to revise an attempted assessment. It copies questions, answers and skill mappings into a separate hidden assessment with a source reference. It does not copy attempts, grades, certificates or used attempt counts. Existing results stay with the original. Publication of the copy does not automatically hide the original; manage both deliberately. Hide actions refuse unresolved in-progress assessment attempts.

## Work on content in parallel

Use `content-workspace/LESSON_TEMPLATE.md` for offline writing and review. `content-workspace/meeting-preparation-draft.md` is an original sample for editorial review, not automatically imported or published. Copy the learner text into a draft lesson, enter self-study questions through the practice editor, and enter the formal quiz separately. Do not paste formal answer keys into learner lesson text.

Review each lesson for a clear outcome, an example, a practical activity, useful answer explanations, accessibility and realistic duration. Test links and ensure you have permission to use external material. For the pilot, finish one coherent sequence before expanding the catalogue.

## Verification and remaining rollout checks

Database tests run locally against isolated PostgreSQL, not your hosted Supabase project. After applying 037, verify with one Super Admin and one learner: save draft → learner cannot see it → preview → publish parents/course → learner can see it. Then copy an attempted assessment and confirm original results remain unchanged. No hosted content, account roles or enrolments were changed during implementation.
