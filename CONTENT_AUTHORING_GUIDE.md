# Manage skills, modules, lessons and assessments

Apply migration **039_skill_module_lesson_assessments.sql** after 038 before using the updated authoring screens. It adds lesson-linked assessments and direct module creation under skills. It preserves existing IDs, content, enrolments, lesson progress and assessment results. Applying it does not publish the imported grammar drafts or enrol learners.

## One content structure

**Skill → Module → Lesson → Assessment**

1. Open Super Admin → Manage Skills. Add a skill or edit an existing one. There is no fixed eight-skill limit. Hide a skill to remove it from the learning path while retaining its records.
2. Under the skill, add a module. There is no course selector. New modules are hidden drafts.
3. Open the module to add or edit lessons, videos, reading links and practice questions. Preview a lesson before saving. Each lesson has its own visibility setting.
4. Inside a lesson, open **Manage this lesson’s assessments** to add questions, answer keys and skill mappings. New assessments are drafts.
5. Publish the lesson and module when reviewed; its parent skill must also be published. The platform handles the underlying access container. Published content is available only to appropriately enrolled learners with active access.
6. Students choose a skill, open its modules and lessons, and take assessments listed beside the relevant lesson. Course names and course assessment sections are removed from this learning view.

## Existing material

Old course editor links redirect to Manage Skills. Course records remain internally for enrolment, access and certificate compatibility; they are not a second content-authoring structure. College and programme access assignments remain separate from publishing.

Modules without a skill appear under **Modules needing a skill** for an admin to assign. They do not create an extra pseudo-skill in the learner menu.

Existing assessments without a lesson are not guessed onto a lesson. In the lesson assessment editor, use **Use an existing assessment** to create and attach a draft copy from the same underlying learning content. Original results remain intact. Review and publish the new copy when ready. Historical assessments and results remain accessible through existing result links.

## Assessment integrity

Formal questions need positive marks, 2–10 distinct options, a matching answer key and valid skill mappings. Each measured skill needs at least three questions. Practice assessments do not affect skill scores. Hidden lessons, modules and skills cannot be bypassed by starting a lesson assessment through a direct link.

Questions and grading settings are locked after the first attempt. Use an editable draft copy for revisions. Copies keep their lesson association and questions, but never copy attempts or grades. Existing in-progress attempts can still be submitted under the existing assessment submission rules.

## Publishing and editing

Editing a published lesson changes the text for current learners while preserving progress. There is no separate unpublished revision of the same lesson. Draft and hidden both use INACTIVE status. Hiding is reversible; it does not delete learning history.

The English Grammar import remains four separate modules: Parts of Speech, Articles, Prepositions and Tenses. Content edited in one lesson never silently replaces another lesson with a similar title. Use the module and lesson editor as the authoritative location for that content.

## Checks

The hierarchy migration has isolated database tests for admin access, hidden-parent assessment access, publication, copying and preserved history. After applying 039, test one module and lesson with a super admin and an assigned student before publishing more content.
