/** Phase 3 Employability Score & Skill Gap types */

export type ClassificationCode =
  | 'PLACEMENT_READY'
  | 'NEAR_READY'
  | 'NEEDS_IMPROVEMENT'
  | 'HIGH_PRIORITY'
  | string;

export interface EmployabilityWeight {
  id: string;
  skill_id: string;
  weight_percent: number;
  is_active: boolean;
  skill?: { id: string; code: string; name: string };
}

export interface EmployabilityClassification {
  id: string;
  code: string;
  label: string;
  min_score: number;
  max_score: number;
  sort_order: number;
  is_active: boolean;
}

export interface SkillGapTarget {
  skill_id: string;
  target_proficiency: number;
}

export interface BreakdownItem {
  skill_id: string;
  code: string;
  name: string;
  weight_percent: number;
  proficiency: number | null;
  target: number;
  gap: number | null;
  included: boolean;
}

export interface EmployabilityResult {
  student_id: string;
  score: number;
  classification_code: string | null;
  classification_label: string | null;
  is_provisional: boolean;
  skills_measured: number;
  skills_weighted: number;
  breakdown: BreakdownItem[];
  history_id?: string;
  error?: string;
}

export interface SkillGapItem {
  skill_id: string;
  code: string;
  name: string;
  proficiency: number | null;
  target: number;
  gap: number;
  weight_percent: number;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  skill_code: string;
  skill_name: string;
  message: string;
}

export interface CollegeAnalyticsSummary {
  scores_available: boolean;
  generated_at: string;
  latest_measurement: string | null;
  individual_students: number;
  college_students: number;
  provisional_students: number;
  enrolments: number;
  completed_enrolments: number;
  students_enrolled: number;
  average_progress: number | null;
  graded_attempts: number;
  college_averages: { college_id: string | null; name: string; students: number; measured: number; average: number | null }[];
  total_students: number;
  students_with_score: number;
  average_score: number | null;
  classification_counts: Record<string, number>;
  top_skill_gaps: { code: string; name: string; avg_gap: number; n: number }[];
  department_averages: { department_id: string | null; department_name: string; avg_score: number; n: number }[];
  batch_averages: { batch_id: string | null; batch_name: string; avg_score: number; n: number }[];
}
