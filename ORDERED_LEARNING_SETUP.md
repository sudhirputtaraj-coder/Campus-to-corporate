# Ordered student learning and skill content

## Apply once

Run the complete `supabase/migrations/032_ordered_learning_content.sql` in Supabase SQL Editor after 031. It adds skill display order and lesson practice Q&A storage, assigns the imported AI module to the single active AI Knowledge skill when present, maps the original Email Etiquette module to Communication, and updates only original imported Communication sequence values. Existing IDs, enrolments, completed lessons, assessment history and scoring weights are retained. Existing table RLS remains enabled; no new tables or broader data-access grants are introduced.

The UI can display the learning path before applying SQL, but administrator content saving requires 032 and the AI mapping appears only after the migration. If AI Knowledge is absent or duplicated, the migration does not guess which skill to use: assign the module manually under Manage Skill Modules.

## Student journey

Dashboard -> My Learning Path -> Assessments -> My Skill Scores -> Employability Summary -> Certificates. WhatsApp preferences are secondary. Desktop and mobile navigation use the same labels and order.

The next-lesson card starts with the handbook orientation, then chooses the first unfinished published lesson in curriculum order. The default skills are Professionalism, Communication, Critical Thinking, Problem Solving, Teamwork, Time Management, Adaptability, AI Knowledge. Other skills follow unless the administrator changes their display order. Published modules and lessons remain available for revision; this is guidance, not sequential locking.

My Learning Path groups the enrolled content by skill and module. Orientation appears separately. Each skill displays completed/available lesson counts. Empty skills say content is coming soon. The course library remains a secondary way to open an outline. Continue links directly to a lesson; lesson Next/Previous follows the same path across module and course boundaries. At the end, the student can review assessments. Merely clicking Next does not mark a lesson completed; the existing Mark complete control remains explicit.

Course outline numbering is presentation-only. Stored titles, lesson IDs and progress are not rewritten. Adding new lessons can increase the number of lessons required for completion. Skill order is independent of scoring weights. Formal assessments must still be authored and mapped to skills separately; self-study questions never create a proficiency score.

## Adding content as Super Admin

1. Open Manage Skill Modules and choose a skill. Edit its Skill order to control the student sequence (smaller numbers first).
2. Add a module, choose its course, and set its display order. A course still controls enrolment/access; modules do not independently grant course access.
3. Open that module and add as many lessons/resources as needed. Each lesson supports written text, an HTTPS video embed link, an HTTPS reading link, duration, display order and Published/Hidden visibility.
4. Use Add question and answer to create practice Q&A. Each lesson supports up to 50 pairs, with 1,000 characters per question and 5,000 per answer. Use additional lessons for more questions. Students reveal answers using expandable sections. They are intentionally available for self-study and must not be used to store secret formal test answer keys.
5. Use another lesson for each extra video or reading link. Keep video links embeddable. The module editor links to course assessment management for formal graded questions.

Student lesson fetching is paginated, including libraries above the API's default row limit. Learning-path reads are scoped to the current student's active/completed enrolments and existing RLS. Lesson links disable prefetch so browsing outlines does not eagerly load progress-writing lesson pages.

## Validation

- All 28 regression scripts passed, including 73 isolated database workflow checks. Additional learning-path tests cover curriculum/administrator order, orientation, hidden content, cross-course continuation, completion lookup, practice input validation, a 1,001-lesson library, scoped progress reads and error handling.
- TypeScript passed. Targeted source lint had no errors (existing typing/unused-variable warnings remain).
- Checked the signed-in student dashboard and learning path in the browser: next-lesson link, preserved completion count, numbered skill groups, secondary access panel and updated navigation.
- Migration 032 was tested in isolated PostgreSQL/PGlite, including reruns, malformed practice content rejection, student write denial, AI mapping and preservation of history/progress. The user successfully applied 032 to hosted Supabase. A subsequent browser check confirmed AI Knowledge has its module, Communication starts with grammar, and completion remains 2 of 41 lessons.
- No formal assessment was submitted or lesson marked complete during the browser check. Administrator saving against hosted Supabase must be verified after applying 032. Run the production build before deployment. No GitHub push was performed in this update.
