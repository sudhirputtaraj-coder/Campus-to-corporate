-- Optional Phase 2 demo seed (run AFTER 002_phase2_learning.sql)
-- Clearly labelled DEMO content — not production student data.
-- Replace created_by with a real Super Admin user_id if desired.

-- Demo course
INSERT INTO courses (id, title, description, category, duration_minutes, level, status)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Email Etiquette',
  'Professional email writing for the workplace. DEMO course for Phase 2 testing.',
  'Corporate Communication',
  90,
  'BEGINNER',
  'ACTIVE'
) ON CONFLICT DO NOTHING;

INSERT INTO modules (id, course_id, title, description, sequence, status)
VALUES (
  'a0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000001',
  'Foundations of Professional Email',
  'Core principles of workplace email.',
  1,
  'ACTIVE'
) ON CONFLICT DO NOTHING;

INSERT INTO lessons (id, module_id, title, content, duration_minutes, sequence, status)
VALUES
(
  'a0000000-0000-4000-8000-000000000021',
  'a0000000-0000-4000-8000-000000000011',
  'Why Email Matters at Work',
  'Email is one of the primary tools of professional communication. Clear subject lines, appropriate tone, and concise structure improve response rates and workplace relationships.

Key points:
1. Use a clear subject line.
2. Address the recipient appropriately.
3. State your purpose in the first two lines.
4. Close with a clear call to action.',
  15,
  1,
  'ACTIVE'
),
(
  'a0000000-0000-4000-8000-000000000022',
  'a0000000-0000-4000-8000-000000000011',
  'Tone and Professional Language',
  'Avoid slang, excessive exclamation marks, and all-caps. Prefer active voice and polite requests. Proofread before sending.',
  20,
  2,
  'ACTIVE'
) ON CONFLICT DO NOTHING;

INSERT INTO assessments (id, course_id, title, description, type, duration_minutes, passing_score, max_attempts, status)
VALUES (
  'a0000000-0000-4000-8000-000000000031',
  'a0000000-0000-4000-8000-000000000001',
  'Email Etiquette Quiz',
  'DEMO assessment — auto-graded MCQ/True-False.',
  'MCQ',
  15,
  60,
  3,
  'ACTIVE'
) ON CONFLICT DO NOTHING;

INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, marks, skill_category, sequence)
VALUES
(
  'a0000000-0000-4000-8000-000000000031',
  'A professional email subject line should be:',
  'MCQ',
  '["Vague and short","Clear and specific","Written in all caps","Left blank"]',
  'Clear and specific',
  1,
  'Communication',
  1
),
(
  'a0000000-0000-4000-8000-000000000031',
  'Using ALL CAPS in an email is considered professional.',
  'TRUE_FALSE',
  '["True","False"]',
  'False',
  1,
  'Professionalism',
  2
) ON CONFLICT DO NOTHING;
