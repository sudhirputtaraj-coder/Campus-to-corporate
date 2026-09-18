-- Campus-to-Corporate Phase 2A — Employability Skill Engine
-- Extends Phase 2. Does NOT modify or drop Phase 1/2 tables beyond
-- adding assessments.is_practice. Does NOT backfill questions.skill_category.
-- Does NOT modify students.employability_score.

-- ============================================================
-- ASSESSMENTS: formal vs practice
-- assessments.type remains an item-format enum (MCQ, MIXED, etc.).
-- Formal/practice is a separate boolean. Existing rows default to formal.
-- ============================================================
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assessments.is_practice IS
  'False = formal assessment (eligible for skill snapshots). True = practice (Phase 2A does not create snapshots or update skill proficiency). Distinct from assessments.type, which is an item-format enum.';

-- ============================================================
-- SKILLS (platform catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);

COMMENT ON TABLE skills IS 'Phase 2A employability skill catalog. Not derived from questions.skill_category.';

INSERT INTO skills (code, name, description)
VALUES
  ('COMM', 'Communication', 'Ability to convey information clearly and effectively'),
  ('CRT', 'Critical Thinking', 'Ability to analyze facts and form a reasoned judgment'),
  ('PROB', 'Problem Solving', 'Ability to identify issues and implement effective solutions'),
  ('TEAM', 'Teamwork', 'Ability to collaborate and work effectively with others'),
  ('TIME', 'Time Management', 'Ability to plan and control time spent on activities'),
  ('ADAPT', 'Adaptability', 'Ability to adjust to new conditions and changes'),
  ('PROF', 'Professionalism', 'Ability to conduct oneself with competence and workplace etiquette')
ON CONFLICT (code) DO NOTHING;

DROP TRIGGER IF EXISTS set_skills_updated_at ON skills;
CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- QUESTION_SKILLS (many-to-many mapping with per-question weights)
-- UNIQUE (question_id, skill_id) already provides a btree left-prefix
-- on question_id; do not add a redundant question_id-only index.
-- Legacy questions.skill_category is intentionally left unmapped.
-- ============================================================
CREATE TABLE IF NOT EXISTS question_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  weight NUMERIC(5,4) NOT NULL CHECK (weight > 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_question_skills_skill_id ON question_skills(skill_id);

COMMENT ON TABLE question_skills IS
  'Phase 2A question-to-skill mappings. Weights for a mapped question must sum to 1.00. Unmapped questions are allowed. No automatic legacy skill_category backfill.';

-- Deferred per-row constraint trigger: after INSERT/UPDATE/DELETE, any
-- question that still has mappings must have SUM(weight) = 1.00.
-- Unmapped questions (zero remaining rows) are valid.
-- UPDATE of question_id validates both OLD and NEW question IDs.
CREATE OR REPLACE FUNCTION public.fn_validate_question_skill_weights()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_qid UUID;
  v_sum NUMERIC(8,4);
  v_cnt INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ids := ARRAY[OLD.question_id];
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.question_id IS DISTINCT FROM NEW.question_id THEN
      v_ids := ARRAY[OLD.question_id, NEW.question_id];
    ELSE
      v_ids := ARRAY[NEW.question_id];
    END IF;
  ELSE
    v_ids := ARRAY[NEW.question_id];
  END IF;

  FOREACH v_qid IN ARRAY v_ids
  LOOP
    SELECT COUNT(*), COALESCE(SUM(weight), 0)
    INTO v_cnt, v_sum
    FROM public.question_skills
    WHERE question_id = v_qid;

    IF v_cnt > 0 AND ROUND(v_sum, 4) <> 1.0000 THEN
      RAISE EXCEPTION
        'question_skills weights for question_id % must sum to 1.00 (got %)',
        v_qid, v_sum
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_question_skills_weight_sum ON question_skills;
CREATE CONSTRAINT TRIGGER trg_question_skills_weight_sum
  AFTER INSERT OR UPDATE OR DELETE ON question_skills
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_question_skill_weights();


-- ============================================================
-- STUDENT SKILL SNAPSHOTS (per attempt, per skill)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_skill_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  applicable_question_count INTEGER NOT NULL DEFAULT 0,
  weighted_obtained NUMERIC(12,4) NOT NULL DEFAULT 0,
  weighted_total NUMERIC(12,4) NOT NULL DEFAULT 0,
  proficiency NUMERIC(5,2)
    CHECK (proficiency IS NULL OR (proficiency >= 0 AND proficiency <= 100)),
  is_valid BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, skill_id, attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_snapshots_student_skill
  ON student_skill_snapshots(student_id, skill_id, is_valid);
CREATE INDEX IF NOT EXISTS idx_skill_snapshots_attempt
  ON student_skill_snapshots(attempt_id);

COMMENT ON TABLE student_skill_snapshots IS
  'Phase 2A per-attempt skill snapshots. Only GRADED formal attempts are written. is_valid requires at least 3 applicable questions and a positive weighted total. Reprocessing is idempotent via UNIQUE(student_id, skill_id, attempt_id).';

-- ============================================================
-- STUDENT SKILL SUMMARIES (current proficiency per student/skill)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_skill_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  current_proficiency NUMERIC(5,2)
    CHECK (current_proficiency IS NULL OR (current_proficiency >= 0 AND current_proficiency <= 100)),
  last_valid_snapshot_id UUID REFERENCES student_skill_snapshots(id) ON DELETE SET NULL,
  last_attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  applicable_question_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_summaries_student ON student_skill_summaries(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_summaries_skill ON student_skill_summaries(skill_id);

COMMENT ON TABLE student_skill_summaries IS
  'Phase 2A current skill proficiency. current_proficiency is taken from the most recent valid formal snapshot. Invalid snapshots must not overwrite a previous valid proficiency except when recomputing from remaining valid snapshots.';

DROP TRIGGER IF EXISTS set_skill_summaries_updated_at ON student_skill_summaries;
CREATE TRIGGER set_skill_summaries_updated_at
  BEFORE UPDATE ON student_skill_summaries FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skill_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skill_summaries ENABLE ROW LEVEL SECURITY;

-- skills: catalog is readable; Super Admin manages
DROP POLICY IF EXISTS "Super Admin full access to skills" ON skills;
CREATE POLICY "Super Admin full access to skills"
  ON skills FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Authenticated can view active skills" ON skills;
CREATE POLICY "Authenticated can view active skills"
  ON skills FOR SELECT
  USING (status = 'ACTIVE' OR is_super_admin());

-- question_skills: Super Admin only (aligned with questions table after 003).
-- The skill processor reads mappings via SECURITY DEFINER.
DROP POLICY IF EXISTS "Super Admin full access to question_skills" ON question_skills;
CREATE POLICY "Super Admin full access to question_skills"
  ON question_skills FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- student_skill_snapshots
DROP POLICY IF EXISTS "Super Admin full access to skill snapshots" ON student_skill_snapshots;
CREATE POLICY "Super Admin full access to skill snapshots"
  ON student_skill_snapshots FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Student view own skill snapshots" ON student_skill_snapshots;
CREATE POLICY "Student view own skill snapshots"
  ON student_skill_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_snapshots.student_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "College Admin view college skill snapshots" ON student_skill_snapshots;
CREATE POLICY "College Admin view college skill snapshots"
  ON student_skill_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_snapshots.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view assigned skill snapshots" ON student_skill_snapshots;
CREATE POLICY "Trainer view assigned skill snapshots"
  ON student_skill_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_snapshots.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );

-- student_skill_summaries
DROP POLICY IF EXISTS "Super Admin full access to skill summaries" ON student_skill_summaries;
CREATE POLICY "Super Admin full access to skill summaries"
  ON student_skill_summaries FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Student view own skill summaries" ON student_skill_summaries;
CREATE POLICY "Student view own skill summaries"
  ON student_skill_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_summaries.student_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "College Admin view college skill summaries" ON student_skill_summaries;
CREATE POLICY "College Admin view college skill summaries"
  ON student_skill_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_summaries.student_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
  );

DROP POLICY IF EXISTS "Trainer view assigned skill summaries" ON student_skill_summaries;
CREATE POLICY "Trainer view assigned skill summaries"
  ON student_skill_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skill_summaries.student_id
        AND s.batch_id IN (SELECT get_trainer_batch_ids())
    )
  );


-- ============================================================
-- RPC: process skill snapshots/summaries for one GRADED formal attempt
-- Does not modify assessment_attempts, assessment_answers, questions,
-- assessments, or students.employability_score.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_process_attempt_skills(p_attempt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_student_id UUID;
  v_student_user_id UUID;
  v_status attempt_status;
  v_is_practice BOOLEAN;
  v_skill_id UUID;
  v_count INTEGER;
  v_obtained NUMERIC(12,4);
  v_total NUMERIC(12,4);
  v_proficiency NUMERIC(5,2);
  v_is_valid BOOLEAN;
  v_snapshot_id UUID;
  v_latest_id UUID;
  v_latest_proficiency NUMERIC(5,2);
  v_latest_attempt_id UUID;
  v_latest_count INTEGER;
BEGIN
  SELECT
    aa.student_id,
    s.user_id,
    aa.status,
    a.is_practice
  INTO
    v_student_id,
    v_student_user_id,
    v_status,
    v_is_practice
  FROM assessment_attempts aa
  JOIN students s ON s.id = aa.student_id
  JOIN assessments a ON a.id = aa.assessment_id
  WHERE aa.id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found.';
  END IF;

  -- Attempt owner or Super Admin only
  IF NOT is_super_admin() THEN
    IF v_student_user_id IS NULL OR v_student_user_id <> v_caller_user_id THEN
      RAISE EXCEPTION 'Unauthorized: You can only process skill results for your own attempts.';
    END IF;
  END IF;

  -- Only GRADED attempts are eligible
  IF v_status IS DISTINCT FROM 'GRADED'::attempt_status THEN
    RETURN;
  END IF;

  -- Practice assessments must not create snapshots or update proficiency
  IF v_is_practice IS TRUE THEN
    RETURN;
  END IF;

  -- Serialize concurrent reprocessing of the same attempt
  PERFORM 1
  FROM assessment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;


  -- Per-skill aggregation from stored answers + question_skills.
  -- Uses assessment_answers.is_correct and marks_awarded as stored.
  -- Does not re-grade and does not write to answers/questions/attempts.
  FOR v_skill_id, v_count, v_obtained, v_total IN
    SELECT
      qs.skill_id,
      COUNT(DISTINCT ans.question_id)::INTEGER,
      COALESCE(SUM(ans.marks_awarded * qs.weight), 0),
      COALESCE(SUM(q.marks * qs.weight), 0)
    FROM assessment_answers ans
    JOIN questions q ON q.id = ans.question_id
    JOIN question_skills qs ON qs.question_id = q.id
    WHERE ans.attempt_id = p_attempt_id
    GROUP BY qs.skill_id
  LOOP
    v_snapshot_id := NULL;
    v_latest_id := NULL;
    v_latest_proficiency := NULL;
    v_latest_attempt_id := NULL;
    v_latest_count := NULL;
    v_proficiency := NULL;
    v_is_valid := false;

    -- Weighted total of 0 means proficiency cannot be calculated.
    IF v_total > 0 THEN
      v_proficiency := ROUND((v_obtained / v_total) * 100, 2);
    END IF;

    -- Valid proficiency requires >= 3 applicable questions and a positive total.
    v_is_valid := (v_count >= 3 AND v_total > 0);

    INSERT INTO student_skill_snapshots (
      student_id,
      skill_id,
      attempt_id,
      applicable_question_count,
      weighted_obtained,
      weighted_total,
      proficiency,
      is_valid,
      processed_at
    )
    VALUES (
      v_student_id,
      v_skill_id,
      p_attempt_id,
      v_count,
      v_obtained,
      v_total,
      v_proficiency,
      v_is_valid,
      NOW()
    )
    ON CONFLICT (student_id, skill_id, attempt_id)
    DO UPDATE SET
      applicable_question_count = EXCLUDED.applicable_question_count,
      weighted_obtained = EXCLUDED.weighted_obtained,
      weighted_total = EXCLUDED.weighted_total,
      proficiency = EXCLUDED.proficiency,
      is_valid = EXCLUDED.is_valid,
      processed_at = NOW()
    RETURNING id INTO v_snapshot_id;

    -- Summary always reflects the most recent VALID formal snapshot.
    -- An invalid snapshot must not overwrite a previous valid proficiency.
    -- Reprocessing this attempt is covered because this snapshot is upserted
    -- first, then the latest remaining valid snapshot is selected.
    SELECT
      snap.id,
      snap.proficiency,
      snap.attempt_id,
      snap.applicable_question_count
    INTO
      v_latest_id,
      v_latest_proficiency,
      v_latest_attempt_id,
      v_latest_count
    FROM student_skill_snapshots snap
    JOIN assessment_attempts aa ON aa.id = snap.attempt_id
    JOIN assessments a ON a.id = aa.assessment_id
    WHERE snap.student_id = v_student_id
      AND snap.skill_id = v_skill_id
      AND snap.is_valid IS TRUE
      AND a.is_practice IS NOT TRUE
    ORDER BY COALESCE(aa.completed_at, aa.created_at) DESC, snap.created_at DESC, snap.id DESC
    LIMIT 1;

    INSERT INTO student_skill_summaries (
      student_id,
      skill_id,
      current_proficiency,
      last_valid_snapshot_id,
      last_attempt_id,
      applicable_question_count
    )
    VALUES (
      v_student_id,
      v_skill_id,
      v_latest_proficiency,
      v_latest_id,
      v_latest_attempt_id,
      COALESCE(v_latest_count, 0)
    )
    ON CONFLICT (student_id, skill_id)
    DO UPDATE SET
      current_proficiency = EXCLUDED.current_proficiency,
      last_valid_snapshot_id = EXCLUDED.last_valid_snapshot_id,
      last_attempt_id = EXCLUDED.last_attempt_id,
      applicable_question_count = EXCLUDED.applicable_question_count;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_process_attempt_skills(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_process_attempt_skills(UUID) TO authenticated;

