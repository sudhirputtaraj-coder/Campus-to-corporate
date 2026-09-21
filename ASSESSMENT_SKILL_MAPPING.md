# Assessment skill mapping editor

## Apply once

Run `supabase/migrations/011_assessment_skill_editor.sql` in Supabase SQL Editor after 010. The migration is transactional. It does not backfill question mappings or recalculate past results.

## Administrator workflow

1. Sign in as an existing active Super Admin. Account selection is still deferred.
2. Open **Manage Courses → course → Assessments & Questions**.
3. Create an assessment and its questions, then open **Skills measured** on each question.
4. Choose a skill and enter **100%**, or add several skills with percentages totalling exactly **100%** (for example Communication 60%, Critical Thinking 40%).
5. Save. The assessment displays counts of mapped questions by skill. At least three applicable questions and a positive weighted marks total are needed for valid proficiency. Practice assessments still do not contribute to skill scores.

The old free-text `skill_category` field was only a label. It is no longer shown as a scoring input. Existing labels remain stored, but scoring uses `question_skills` exclusively.

## Existing assessments and history

Mappings are locked as soon as an assessment has its first attempt, including an in-progress attempt. Create a new assessment to use different mappings. Existing mappings remain visible. Mapping writes and attempt creation lock the same assessment row; the database enforces this rule for direct writes as well as the UI. This does not freeze other existing question/assessment fields.

Before an assessment has attempts, a question may be left unmapped by saving an empty list. Replacing a mapping happens in one transaction so invalid totals cannot delete previous mappings. New skills created in Manage Skill Modules can be selected when active. No privilege changes, payment activation or automatic rescoring are performed.

## Verification

- TypeScript passed.
- Five mapping validation/action tests and fifteen skill-dashboard regression checks passed.
- Forty-seven isolated PostgreSQL checks passed across all eleven migrations, including administrator-only mapping changes, atomic replacements, unchanged mappings after invalid input and locks after the first attempt.
- Hosted migration application and authenticated browser validation remain pending. No Super Admin account was created or promoted. Razorpay onboarding remains on hold.

Commands: `node tests/skill-mappings.cjs`, `node tests/skills-dashboard.cjs`, and `node tests/payment-database.cjs <path-to-@electric-sql/pglite>`.
