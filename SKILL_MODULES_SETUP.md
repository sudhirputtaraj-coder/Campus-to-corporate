# Skill learning modules

The seven skills can each contain multiple learning modules. Example: Communication → Email Writing / Grammar → multiple lessons containing text and an optional HTTPS video embed link per lesson. Add more lessons for additional videos. Direct video-file uploads are not included.

## Expanded content management (migration 010)

After migration 009, run `supabase/migrations/010_skill_content_management.sql` once. It adds optional reading links and hides unpublished content from student reads, including direct URLs. No earlier migration needs to be rerun.

At `/admin/skills`, an active Super Admin can now:

- Add new skills beyond the original seven; edit their names, descriptions and visibility.
- Add 10 or more modules under each skill, without a fixed limit.
- Open a module to edit its title, description, parent skill, order and visibility.
- Create or edit multiple lessons per module. Each lesson supports written text, one HTTPS video embed URL and one HTTPS reading link. Add more lessons for more resources.
- Hide and republish skills/modules/lessons without deleting history. Hidden parent skills also hide their module content from students.

Renaming an existing skill preserves its ID, scoring code and assessment mappings. New skills remain unassessed until formal assessment questions are mapped to them; adding content does not create scores. Students see reading links on the lesson page, opening in a new tab.

Validation for this expansion: TypeScript, seven content-action/validation tests, five module-action tests, fifteen skill-dashboard checks, and the expanded isolated PostgreSQL tests pass. The database test includes twelve modules under one skill, reading links, hidden content and paid-access isolation. Authenticated browser verification requires the user's Super Admin account, which remains undecided. Migration 010 has not been applied to hosted Supabase by the agent.

## Apply once

Run the complete `supabase/migrations/009_skill_learning_modules.sql` in Supabase SQL Editor after the already-applied 007 and 008. This adds a nullable skill link to existing modules; it does not create example content, change enrolment, grant paid access or alter proficiency scores.

## Add content

1. Sign in with an existing active Super Admin account. The owner's administrator email selection is still deferred; no account has been promoted by this change.
2. Open **Super Admin → Manage Skill Modules** (`/admin/skills`).
3. Under Communication, enter **Email Writing**, choose its course and add the module. Repeat for **Grammar**. The course continues to control enrolment and paid access. Create a course via Manage Courses first if needed.
4. Open **manage lessons and videos** next to the module. Add lesson titles, display order, text content and optional HTTPS embed links. Video hosts must support embedding.
5. Existing modules can be linked through **Manage Courses → course → Parent skill → Save skill**.
6. Students open **My Skills → Learning modules** on any skill card. Only modules in accessible courses appear. Unpaid/expired individual students see an access message; college students use their normal enrolments.

## Verification

TypeScript and existing skill-dashboard tests pass. Five action tests cover active-admin authorization, skill validation, module linking/unlinking, score preservation and video/module validation. The isolated PostgreSQL suite applies all nine migrations and verifies multiple modules under Communication plus unpaid access restrictions. Hosted SQL application and authenticated browser acceptance remain pending.

Razorpay onboarding remains on hold. This feature does not enable payments. The new files and prior payment work are local and have not been pushed to GitHub.
