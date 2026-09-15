-- Campus-to-Corporate Phase 1 Schema
-- PostgreSQL / Supabase
-- Run this in Supabase SQL Editor or via CLI after creating a project.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'COLLEGE_ADMIN',
  'TRAINER',
  'STUDENT'
);

CREATE TYPE entity_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'SUSPENDED'
);

CREATE TYPE notification_type AS ENUM (
  'SYSTEM',
  'LEARNING',
  'ASSESSMENT',
  'PAYMENT',
  'CERTIFICATE',
  'INTERVIEW',
  'CAREER',
  'ANNOUNCEMENT'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'STUDENT',
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- ============================================================
-- COLLEGES
-- ============================================================
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  status entity_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_colleges_code ON colleges(code);
CREATE INDEX idx_colleges_status ON colleges(status);
CREATE INDEX idx_colleges_name ON colleges(name);

-- ============================================================
-- USER COLLEGE MEMBERSHIPS (for College Admins, future roles)
-- ============================================================
CREATE TABLE user_college_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, college_id, role)
);

CREATE INDEX idx_ucm_user_id ON user_college_memberships(user_id);
CREATE INDEX idx_ucm_college_id ON user_college_memberships(college_id);

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(college_id, code)
);

CREATE INDEX idx_departments_college_id ON departments(college_id);
CREATE INDEX idx_departments_status ON departments(status);

-- ============================================================
-- BATCHES
-- ============================================================
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  academic_year TEXT,
  semester INTEGER,
  start_date DATE,
  end_date DATE,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_college_id ON batches(college_id);
CREATE INDEX idx_batches_department_id ON batches(department_id);
CREATE INDEX idx_batches_status ON batches(status);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  register_number TEXT NOT NULL,
  course TEXT,
  branch TEXT,
  semester INTEGER,
  graduation_year INTEGER,
  date_of_birth DATE,
  gender TEXT,
  academic_score NUMERIC(5,2) DEFAULT 0,
  career_interest TEXT,
  profile_completion INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  employability_score INTEGER NOT NULL DEFAULT 0 CHECK (employability_score >= 0 AND employability_score <= 100),
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(college_id, register_number)
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_college_id ON students(college_id);
CREATE INDEX idx_students_department_id ON students(department_id);
CREATE INDEX idx_students_batch_id ON students(batch_id);
CREATE INDEX idx_students_register_number ON students(register_number);
CREATE INDEX idx_students_status ON students(status);

-- ============================================================
-- TRAINERS
-- ============================================================
CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  specialization TEXT,
  experience_years INTEGER DEFAULT 0,
  qualification TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trainers_user_id ON trainers(user_id);
CREATE INDEX idx_trainers_college_id ON trainers(college_id);
CREATE INDEX idx_trainers_status ON trainers(status);

-- ============================================================
-- TRAINER BATCH ASSIGNMENTS
-- ============================================================
CREATE TABLE trainer_batch_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(trainer_id, batch_id)
);

CREATE INDEX idx_tba_trainer_id ON trainer_batch_assignments(trainer_id);
CREATE INDEX idx_tba_batch_id ON trainer_batch_assignments(batch_id);

-- ============================================================
-- NOTIFICATIONS (in-app)
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'SYSTEM',
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN' AND status = 'ACTIVE'
  );
$$;

-- Check if current user is College Admin for a given college
CREATE OR REPLACE FUNCTION public.is_college_admin(p_college_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_college_memberships ucm
    JOIN profiles p ON p.user_id = ucm.user_id
    WHERE ucm.user_id = auth.uid()
      AND ucm.college_id = p_college_id
      AND ucm.role = 'COLLEGE_ADMIN'
      AND ucm.status = 'ACTIVE'
      AND p.status = 'ACTIVE'
  );
$$;

-- Get colleges the current user is admin of
CREATE OR REPLACE FUNCTION public.get_admin_college_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_id FROM user_college_memberships
  WHERE user_id = auth.uid()
    AND role = 'COLLEGE_ADMIN'
    AND status = 'ACTIVE';
$$;

-- Check if trainer is assigned to a batch
CREATE OR REPLACE FUNCTION public.is_trainer_of_batch(p_batch_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainer_batch_assignments tba
    JOIN trainers t ON t.id = tba.trainer_id
    WHERE t.user_id = auth.uid()
      AND tba.batch_id = p_batch_id
      AND tba.status = 'ACTIVE'
      AND t.status = 'ACTIVE'
  );
$$;

-- Get batches assigned to current trainer
CREATE OR REPLACE FUNCTION public.get_trainer_batch_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tba.batch_id
  FROM trainer_batch_assignments tba
  JOIN trainers t ON t.id = tba.trainer_id
  WHERE t.user_id = auth.uid()
    AND tba.status = 'ACTIVE'
    AND t.status = 'ACTIVE';
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_colleges_updated_at
  BEFORE UPDATE ON colleges
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_college_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can update own profile (limited)"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super Admin full access to profiles"
  ON profiles FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin can view profiles of their college members"
  ON profiles FOR SELECT
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = profiles.user_id
        AND s.college_id IN (SELECT get_admin_college_ids())
    )
    OR EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.user_id = profiles.user_id
        AND t.college_id IN (SELECT get_admin_college_ids())
    )
  );

-- COLLEGES policies
CREATE POLICY "Super Admin full access to colleges"
  ON colleges FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin can view own college"
  ON colleges FOR SELECT
  USING (
    is_super_admin()
    OR id IN (SELECT get_admin_college_ids())
  );

CREATE POLICY "College Admin can update own college"
  ON colleges FOR UPDATE
  USING (id IN (SELECT get_admin_college_ids()))
  WITH CHECK (id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Authenticated users can view active colleges (limited)"
  ON colleges FOR SELECT
  USING (
    status = 'ACTIVE'
    AND (
      is_super_admin()
      OR id IN (SELECT get_admin_college_ids())
      OR EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND college_id = colleges.id)
      OR EXISTS (SELECT 1 FROM trainers WHERE user_id = auth.uid() AND college_id = colleges.id)
    )
  );

-- USER_COLLEGE_MEMBERSHIPS policies
CREATE POLICY "Super Admin full access to memberships"
  ON user_college_memberships FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Users can view own memberships"
  ON user_college_memberships FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());

-- DEPARTMENTS policies
CREATE POLICY "Super Admin full access to departments"
  ON departments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin manage own college departments"
  ON departments FOR ALL
  USING (college_id IN (SELECT get_admin_college_ids()))
  WITH CHECK (college_id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Members can view departments of their college"
  ON departments FOR SELECT
  USING (
    is_super_admin()
    OR college_id IN (SELECT get_admin_college_ids())
    OR EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND college_id = departments.college_id)
    OR EXISTS (SELECT 1 FROM trainers WHERE user_id = auth.uid() AND college_id = departments.college_id)
  );

-- BATCHES policies
CREATE POLICY "Super Admin full access to batches"
  ON batches FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin manage own college batches"
  ON batches FOR ALL
  USING (college_id IN (SELECT get_admin_college_ids()))
  WITH CHECK (college_id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Trainer can view assigned batches"
  ON batches FOR SELECT
  USING (
    is_super_admin()
    OR college_id IN (SELECT get_admin_college_ids())
    OR id IN (SELECT get_trainer_batch_ids())
    OR EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND batch_id = batches.id)
  );

-- STUDENTS policies
CREATE POLICY "Super Admin full access to students"
  ON students FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin manage own college students"
  ON students FOR ALL
  USING (college_id IN (SELECT get_admin_college_ids()))
  WITH CHECK (college_id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Trainer can view students in assigned batches"
  ON students FOR SELECT
  USING (
    is_super_admin()
    OR college_id IN (SELECT get_admin_college_ids())
    OR batch_id IN (SELECT get_trainer_batch_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY "Student can view and update own record"
  ON students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Student can update own permitted fields"
  ON students FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TRAINERS policies
CREATE POLICY "Super Admin full access to trainers"
  ON trainers FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin manage own college trainers"
  ON trainers FOR ALL
  USING (college_id IN (SELECT get_admin_college_ids()))
  WITH CHECK (college_id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Trainer can view own record"
  ON trainers FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin() OR college_id IN (SELECT get_admin_college_ids()));

CREATE POLICY "Trainer can update own record"
  ON trainers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TRAINER_BATCH_ASSIGNMENTS policies
CREATE POLICY "Super Admin full access to assignments"
  ON trainer_batch_assignments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "College Admin manage assignments for their college"
  ON trainer_batch_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = trainer_batch_assignments.trainer_id
        AND t.college_id IN (SELECT get_admin_college_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = trainer_batch_assignments.trainer_id
        AND t.college_id IN (SELECT get_admin_college_ids())
    )
  );

CREATE POLICY "Trainer can view own assignments"
  ON trainer_batch_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = trainer_batch_assignments.trainer_id
        AND t.user_id = auth.uid()
    )
    OR is_super_admin()
  );

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Controlled by service role / backend

-- AUDIT_LOGS policies
CREATE POLICY "Super Admin can view all audit logs"
  ON audit_logs FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Users can view own audit actions"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('college-logos', 'college-logos', true);

-- ============================================================
-- COMMENT
-- ============================================================
COMMENT ON TABLE profiles IS 'User profiles linked to auth.users';
COMMENT ON TABLE colleges IS 'Tenant colleges';
COMMENT ON TABLE students IS 'Student records, tenant-scoped by college_id';
COMMENT ON TABLE trainers IS 'Trainer records, tenant-scoped';
COMMENT ON TABLE trainer_batch_assignments IS 'Controls trainer access to batches/students';
COMMENT ON TABLE audit_logs IS 'Security and change audit trail';
