export type UserRole = 'SUPER_ADMIN' | 'COLLEGE_ADMIN' | 'TRAINER' | 'STUDENT';
export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
export type NotificationType =
  | 'SYSTEM'
  | 'LEARNING'
  | 'ASSESSMENT'
  | 'PAYMENT'
  | 'CERTIFICATE'
  | 'INTERVIEW'
  | 'CAREER'
  | 'ANNOUNCEMENT';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  college_id: string;
  name: string;
  code: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  college_id: string;
  department_id: string | null;
  name: string;
  academic_year: string | null;
  semester: number | null;
  start_date: string | null;
  end_date: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  // joined
  department?: Department | null;
  student_count?: number;
}

export interface Student {
  id: string;
  user_id: string;
  college_id: string | null;
  account_type: 'COLLEGE' | 'INDIVIDUAL';
  department_id: string | null;
  batch_id: string | null;
  register_number: string;
  course: string | null;
  branch: string | null;
  semester: number | null;
  graduation_year: number | null;
  date_of_birth: string | null;
  gender: string | null;
  academic_score: number;
  career_interest: string | null;
  profile_completion: number;
  employability_score: number;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  // joined
  profile?: Profile;
  department?: Department | null;
  batch?: Batch | null;
  college?: College | null;
}

export interface Trainer {
  id: string;
  user_id: string;
  college_id: string;
  specialization: string | null;
  experience_years: number;
  qualification: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  college?: College | null;
  assignments?: TrainerBatchAssignment[];
}

export interface TrainerBatchAssignment {
  id: string;
  trainer_id: string;
  batch_id: string;
  assigned_at: string;
  status: EntityStatus;
  batch?: Batch;
}

export interface UserCollegeMembership {
  id: string;
  user_id: string;
  college_id: string;
  role: UserRole;
  status: EntityStatus;
  created_at: string;
  college?: College;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read_status: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface CsvStudentRow {
  student_name: string;
  email: string;
  phone?: string;
  register_number: string;
  department?: string;
  course?: string;
  branch?: string;
  semester?: string;
  graduation_year?: string;
}

export interface CsvImportResult {
  success: number;
  failed: number;
  errors: { row: number; reason: string; data: Partial<CsvStudentRow> }[];
  imported: Student[];
}

// ========== Phase 2: Learning & Assessment ==========

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';
export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type AssessmentType =
  | 'MCQ'
  | 'MIXED'
  | 'TRUE_FALSE'
  | 'SCENARIO'
  | 'CASE_STUDY'
  | 'SHORT_ANSWER'
  | 'WRITTEN';
export type QuestionType =
  | 'MCQ'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SCENARIO'
  | 'CASE_STUDY'
  | 'SHORT_ANSWER'
  | 'WRITTEN';
export type AttemptStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'PENDING_EVALUATION';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  level: CourseLevel;
  status: EntityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  modules?: Module[];
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sequence: number;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number;
  sequence: number;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  batch_id: string | null;
  enrollment_date: string;
  completion_percentage: number;
  status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  status: LessonProgressStatus;
  completed_at: string | null;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: AssessmentType;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  status: EntityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
}

/** Safe question shape for students (no correct_answer) */
export interface QuestionPublic {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | { label: string; value: string }[];
  marks: number;
  skill_category: string | null;
  sequence: number;
}

export interface Question extends QuestionPublic {
  correct_answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAttempt {
  id: string;
  student_id: string;
  assessment_id: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number;
  percentage: number;
  total_marks: number;
  obtained_marks: number;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assessment?: Assessment;
}

export interface AssessmentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  marks_awarded: number;
  feedback: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  created_at: string;
}

export interface BatchCourseAssignment {
  id: string;
  batch_id: string;
  course_id: string;
  assigned_by: string | null;
  assigned_at: string;
  status: EntityStatus;
  course?: Course;
  batch?: Batch;
}

export interface Certificate {
  id: string;
  student_id: string;
  course_id: string;
  certificate_number: string;
  issue_date: string;
  created_at: string;
  course?: Course;
}
