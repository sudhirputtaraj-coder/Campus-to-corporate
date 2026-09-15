-- Campus-to-Corporate Phase 2 Schema
-- Learning, Courses, Modules, Lessons, Enrollments, Progress, Assessments & Results
-- Extends Phase 1. Does NOT modify or drop Phase 1 tables.

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lesson_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM (
    'MCQ', 'MIXED', 'TRUE_FALSE', 'SCENARIO', 'CASE_STUDY', 'SHORT_ANSWER', 'WRITTEN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'MCQ', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SCENARIO', 'CASE_STUDY', 'SHORT_ANSWER', 'WRITTEN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM (
    'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'PENDING_EVALUATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- COURSES (platform learning content — Super Admin managed)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  level course_level NOT NULL DEFAULT 'BEGINNER',
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 1,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_sequence ON modules(course_id, sequence);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  sequence INTEGER NOT NULL DEFAULT 1,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_sequence ON lessons(module_id, sequence);

-- ============================================================
-- BATCH COURSE ASSIGNMENTS (assign courses to batches)
-- ============================================================
CREATE TABLE IF NOT EXISTS batch_course_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(batch_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_bca_batch_id ON batch_course_assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_bca_course_id ON batch_course_assignments(course_id);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status enrollment_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status lesson_progress_status NOT NULL DEFAULT 'NOT_STARTED',
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON lesson_progress(status);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type assessment_type NOT NULL DEFAULT 'MCQ',
  duration_minutes INTEGER DEFAULT 30,
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 60
    CHECK (passing_score >= 0 AND passing_score <= 100),
  max_attempts INTEGER NOT NULL DEFAULT 3,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'MCQ',
  options JSONB DEFAULT '[]',
  correct_answer TEXT,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  skill_category TEXT,
  sequence INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_assessment_id ON questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_questions_skill ON questions(skill_category);

-- ============================================================
-- ASSESSMENT ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
  score NUMERIC(8,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  total_marks NUMERIC(8,2) DEFAULT 0,
  obtained_marks NUMERIC(8,2) DEFAULT 0,
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, assessment_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON assessment_attempts(status);

-- ============================================================
-- ASSESSMENT ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  marks_awarded NUMERIC(6,2) DEFAULT 0,
  feedback TEXT,
  evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON assessment_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON assessment_answers(question_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS set_courses_updated_at ON courses;
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_modules_updated_at ON modules;
CREATE TRIGGER set_modules_updated_at
  BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_lessons_updated_at ON lessons;
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_enrollments_updated_at ON enrollments;
CREATE TRIGGER set_enrollments_updated_at
  BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_assessments_updated_at ON assessments;
CREATE TRIGGER set_assessments_updated_at
  BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_questions_updated_at ON questions;
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_attempts_updated_at ON assessment_attempts;
CREATE TRIGGER set_attempts_updated_at
  BEFORE UPDATE ON assessment_attempts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- HELPER: recalculate enrollment completion from lesson_progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_enrollment_progress(p_student_id UUID, p_course_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  pct NUMERIC(5,2);
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id
    AND l.status = 'ACTIVE'
    AND m.status = 'ACTIVE';

  IF total_lessons = 0 THEN
    pct := 0;
  ELSE
    SELECT COUNT(*) INTO completed_lessons
    FROM lesson_progress lp
    WHERE lp.student_id = p_student_id
      AND lp.course_id = p_course_id
      AND lp.status = 'COMPLETED';
    pct := ROUND((completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100, 2);
  END IF;

  UPDATE enrollments
  SET completion_percentage = pct,
      status = CASE WHEN pct >= 100 THEN 'COMPLETED'::enrollment_status ELSE status END,
      updated_at = NOW()
  WHERE student_id = p_student_id AND course_id = p_course_id;

  RETURN pct;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

-- COURSES: Super Admin full; enrolled students / college members can view ACTIVE
DROP POLICY IF EXISTS "Super Admin full access to courses" ON courses;
CREATE POLICY "Super Admin full access to courses"
  ON courses FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Authenticated can view active courses" ON courses;
CREATE POLICY "Authenticated can view active courses"
  ON courses FOR SELECT
  USING (
    status = 'ACTIVE'
    OR is_super_admin()
  );

-- MODULES
DROP POLICY IF EXISTS "Super Admin full access to modules" ON modules;
CREATE POLICY "Super Admin full access to modules"
  ON modules FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "View modules of accessible courses" ON modules;
CREATE POLICY "View modules of accessible courses"
  ON modules FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = modules.course_id AND c.status = 'ACTIVE')
  );

-- LESSONS
DROP POLICY IF EXISTS "Super Admin full access to lessons" ON lessons;
CREATE POLICY "Super Admin full access to lessons"
  ON lessons FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "View lessons of accessible modules" ON lessons;
CREATE POLICY "View lessons of accessible modules"
  ON lessons FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.status = 'ACTIVE' AND m.status = 'ACTIVE'
    )
  );

-- BATCH COURSE ASSIGNMENTS
DROP POLICY IF EXISTS "Super Admin full access to batch_course_assignments" ON batch_course_assignments;
CREATE POLICY "Super Admin full access to batch_course_assignments"
  ON batch_course_assignments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "College Admin manage batch course assignments" ON batch_course_assignments;
CREATE POLICY "College Admin manage batch course assignments"
  ON batch_course_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_course_assignments.batch_id
        AND b.college_id IN (SELECT get_admin_college_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_course_assignments.batch_id
        AND b.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view assigned batch courses" ON batch_course_assignments;
CREATE POLICY "Trainer view assigned batch courses"
  ON batch_course_assignments FOR SELECT
  USING (
    batch_id IN (SELECT get_trainer_batch_ids())
    OR is_super_admin()
  );

-- ENROLLMENTS
DROP POLICY IF EXISTS "Super Admin full access to enrollments" ON enrollments;
CREATE POLICY "Super Admin full access to enrollments"
  ON enrollments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "College Admin manage college enrollments" ON enrollments;
CREATE POLICY "College Admin manage college enrollments"
  ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = enrollments.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = enrollments.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view enrollments in assigned batches" ON enrollments;
CREATE POLICY "Trainer view enrollments in assigned batches"
  ON enrollments FOR SELECT
  USING (
    batch_id IN (SELECT get_trainer_batch_ids())
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = enrollments.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

DROP POLICY IF EXISTS "Student view own enrollments" ON enrollments;
CREATE POLICY "Student view own enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = enrollments.student_id AND s.user_id = auth.uid()
    )
  );

-- LESSON PROGRESS
DROP POLICY IF EXISTS "Super Admin full access to lesson_progress" ON lesson_progress;
CREATE POLICY "Super Admin full access to lesson_progress"
  ON lesson_progress FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "College Admin view college lesson progress" ON lesson_progress;
CREATE POLICY "College Admin view college lesson progress"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_progress.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view progress in assigned batches" ON lesson_progress;
CREATE POLICY "Trainer view progress in assigned batches"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_progress.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

DROP POLICY IF EXISTS "Student manage own lesson progress" ON lesson_progress;
CREATE POLICY "Student manage own lesson progress"
  ON lesson_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_progress.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_progress.student_id AND s.user_id = auth.uid()
    )
  );

-- ASSESSMENTS
DROP POLICY IF EXISTS "Super Admin full access to assessments" ON assessments;
CREATE POLICY "Super Admin full access to assessments"
  ON assessments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "View active assessments" ON assessments;
CREATE POLICY "View active assessments"
  ON assessments FOR SELECT
  USING (status = 'ACTIVE' OR is_super_admin());

-- QUESTIONS
-- Super Admin full access. Students/others can SELECT for active assessments.
-- Server actions must omit correct_answer for students before submission.
DROP POLICY IF EXISTS "Super Admin full access to questions" ON questions;
CREATE POLICY "Super Admin full access to questions"
  ON questions FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "View questions for active assessments" ON questions;
CREATE POLICY "View questions for active assessments"
  ON questions FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM assessments a
      WHERE a.id = questions.assessment_id AND a.status = 'ACTIVE'
    )
  );

-- ASSESSMENT ATTEMPTS
DROP POLICY IF EXISTS "Super Admin full access to attempts" ON assessment_attempts;
CREATE POLICY "Super Admin full access to attempts"
  ON assessment_attempts FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "College Admin view college attempts" ON assessment_attempts;
CREATE POLICY "College Admin view college attempts"
  ON assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assessment_attempts.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view attempts in assigned batches" ON assessment_attempts;
CREATE POLICY "Trainer view attempts in assigned batches"
  ON assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assessment_attempts.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer update attempts for evaluation" ON assessment_attempts;
CREATE POLICY "Trainer update attempts for evaluation"
  ON assessment_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assessment_attempts.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

DROP POLICY IF EXISTS "Student manage own attempts" ON assessment_attempts;
CREATE POLICY "Student manage own attempts"
  ON assessment_attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assessment_attempts.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assessment_attempts.student_id AND s.user_id = auth.uid()
    )
  );

-- ASSESSMENT ANSWERS
DROP POLICY IF EXISTS "Super Admin full access to answers" ON assessment_answers;
CREATE POLICY "Super Admin full access to answers"
  ON assessment_answers FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Student manage own answers" ON assessment_answers;
CREATE POLICY "Student manage own answers"
  ON assessment_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN students s ON s.id = aa.student_id
      WHERE aa.id = assessment_answers.attempt_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN students s ON s.id = aa.student_id
      WHERE aa.id = assessment_answers.attempt_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainer view and evaluate answers" ON assessment_answers;
CREATE POLICY "Trainer view and evaluate answers"
  ON assessment_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN students s ON s.id = aa.student_id
      WHERE aa.id = assessment_answers.attempt_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN students s ON s.id = aa.student_id
      WHERE aa.id = assessment_answers.attempt_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

DROP POLICY IF EXISTS "College Admin view college answers" ON assessment_answers;
CREATE POLICY "College Admin view college answers"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN students s ON s.id = aa.student_id
      WHERE aa.id = assessment_answers.attempt_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

COMMENT ON TABLE courses IS 'Phase 2 platform courses';
COMMENT ON TABLE modules IS 'Phase 2 course modules';
COMMENT ON TABLE lessons IS 'Phase 2 module lessons';
COMMENT ON TABLE enrollments IS 'Phase 2 student course enrollments';
COMMENT ON TABLE lesson_progress IS 'Phase 2 per-lesson progress';
COMMENT ON TABLE assessments IS 'Phase 2 assessments linked to courses';
COMMENT ON TABLE questions IS 'Phase 2 assessment questions';
COMMENT ON TABLE assessment_attempts IS 'Phase 2 student assessment attempts (history preserved)';
COMMENT ON TABLE assessment_answers IS 'Phase 2 per-question answers within an attempt';
