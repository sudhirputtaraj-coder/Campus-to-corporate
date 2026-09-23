# Corporate Readiness Handbook modules

Source: `Campus_to_Corporate_Readiness_Handbook.docx`, supplied by the platform owner.

## Included content

One course, **Corporate Readiness Handbook**, with 25 modules and 39 lessons. All 672 non-empty source paragraphs and 22 tables are included. The longer Grammar module has an introduction and four lessons; Workplace Etiquette has an introduction and eight lessons. Welcome guidance, skill introductions, the eight-week study plan and the final readiness checklist are also retained.

The handbook's six subject areas map to the existing seven platform skills:

| Source modules | Platform skill |
| --- | --- |
| 1.1–1.5 Communication | COMM |
| 2.1–2.4 Professionalism and Workplace Etiquette | PROF |
| 3.1 Thinking Critically; 3.3 Working With Data | CRT |
| 3.2 Structured Problem Solving; 3.4 Making Decisions | PROB |
| 4.1–4.4 Teamwork and Collaboration | TEAM |
| 5.1–5.4 Time Management and Productivity | TIME |
| 6.1–6.4 Adaptability and Learning Agility | ADAPT |

No videos were supplied. Administrators can add video embed links and reading links through the existing skill content editor. Checkpoints, activities and supplied answer keys are self-study content, not formal assessments. Reading or completing these lessons does not change assessed skill scores. The existing certificate rules permit a completion certificate once all active lessons are complete; no new formal assessment is added by this import.

## Apply

1. Apply migrations 001–017 first.
2. Open `supabase/migrations/018_readiness_handbook.sql` and copy the complete file into a new Supabase SQL Editor query. Run the entire query, including BEGIN and COMMIT.
3. Refresh the running application. Sign in as an active college student and open **My Learning → Corporate Readiness Handbook**.
4. Open a module, read its lessons and select **Mark complete** when finished. Check Grammar and Workplace Etiquette for the table layouts. Skill-linked modules also appear through **My Skills**.

The import assigns the course to all currently active colleges and enrols their current active students with active STUDENT profiles. It also enrols active individual students whose paid entitlement matches the programme's payment mode and has started but has not expired. It creates no payments and does not change access dates or prices. Normal database access checks continue to apply on every request.

For college students added later, use the existing college-course or batch enrolment screens. New individual payments include this course while it is active. Existing unpaid individuals stay locked until eligible payment activation. Razorpay onboarding remains a separate pending task.

The migration is transactional. Stable IDs and insert-only conflict handling make reruns safe: they do not overwrite edited content, reactivate hidden lessons or suspended enrolments, or reset progress. Reruns can enrol newly eligible students. Do not regenerate the migration to silently replace an edited handbook; create an explicit reviewed content update instead.

## Verify in SQL Editor

```sql
SELECT c.title,
       count(DISTINCT m.id) AS modules,
       count(DISTINCT l.id) AS lessons
FROM public.courses c
LEFT JOIN public.modules m ON m.course_id=c.id
LEFT JOIN public.lessons l ON l.module_id=m.id
WHERE c.id='5ad4db9e-9dfe-5478-870c-21ac5871fa5d'
GROUP BY c.id,c.title;
```

Expected: Corporate Readiness Handbook, 25 modules, 39 lessons.

## Editing and import source

Super Admin → Manage Skills → select a module → edit/add its lessons. Written content accepts plain text, headings beginning with `##`, bullets beginning with `-`, and pipe-delimited tables. HTML is displayed as text rather than executed. Tables scroll horizontally within their lesson on smaller screens.

`content/corporate-readiness-handbook.json` is the initial import manifest. `scripts/import_handbook.py` extracts ordered paragraphs and tables from the supplied Word file, checks that every source block is assigned exactly once, and generates that manifest and migration. It requires Python with python-docx. Run with the source DOCX path and repository root as its two arguments. The Word file need not be committed.

Validation: TypeScript check, five content/rendering tests, and 158 isolated database checks (including 20 handbook checks) passed. Database checks cover college and paid access, unpaid/expired/refunded/future/wrong-mode exclusions, suspended profiles, real row-level security and safe reruns. Hosted application verification remains necessary after applying the SQL.
