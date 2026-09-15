-- 004_certificates.sql
-- Create certificates table and set up RLS policies

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_course_certificate UNIQUE (student_id, course_id)
);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own certificates
CREATE POLICY "Students can view own certificates"
  ON certificates FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- Policy: Super Admins full access to certificates
CREATE POLICY "Super Admin full access to certificates"
  ON certificates FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());