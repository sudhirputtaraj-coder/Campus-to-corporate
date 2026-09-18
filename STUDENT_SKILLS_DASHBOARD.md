# Student skill dashboard

## Scope

The approved next feature exposes existing Phase 2A measurements at `/student/skills`. It does not implement the still-undefined overall employability formula or modify database records, migrations, permissions, or skill processing.

- The main student dashboard links to My Skills through desktop navigation and a card visible on small screens.
- Active catalog skills appear in the Phase 2A code order. Missing proficiency is shown as Not yet assessed; a valid 0% remains a real score.
- Current scores come from `student_skill_summaries`, with their referenced valid snapshot and graded formal attempt providing the assessment title, date, question count, and result link.
- Each skill has expandable history from the student's 50 most recent graded formal attempts. History uses assessment completion order, not processing timestamps. Invalid evidence is labelled and does not replace current proficiency.
- Older source attempts are loaded separately so limiting history cannot hide the source of a current score.
- Failed queries show an error state. Broken score provenance is shown as unavailable, not as an unassessed skill or zero.
- The placeholder overall employability score on the main dashboard now reads Not yet available. Its database field is untouched.
- All reads use the session-preserving Supabase client and existing RLS. Student-specific queries explicitly filter by the authenticated student's ID. No service-role client or answer keys are used.

## Validation

- `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed.
- `node tests/skills-dashboard.cjs` passed all 15 checks, including valid zero, unassessed states, invalid-history preservation, practice exclusion, old provenance, query scoping, error handling, and authentication redirects.
- Tests use mocked queries and rendered React output; they do not independently validate deployed RLS or live PostgREST relationships.
- `git diff --check` passed.
- Live visual verification remains pending: the browser navigation and a separate homepage HTTP probe timed out on localhost port 3002. No live dashboard rendering is claimed.

## Live acceptance check

1. Start a responsive local development server and sign in as the test student.
2. Open My Skills from the dashboard.
3. Verify Communication shows the current stored proficiency (66.67% in the previously verified test data), source assessment, date, and mapped question count.
4. Verify skills without valid evidence show Not yet assessed, with no zero score or proficiency bar.
5. Expand Communication history and check the valid/insufficient-evidence labels and links to results.
6. Check the layout on desktop and a narrow viewport. Confirm another student only sees their own measurements.
