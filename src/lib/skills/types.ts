/**
 * Phase 2A Employability Skill Engine — types and constants.
 *
 * These types describe the Skill Engine objects created by
 * supabase/migrations/005_phase2a_skill_engine.sql. They are kept separate
 * from src/types/database.ts (which is not modified by this module).
 *
 * The SQL function fn_process_attempt_skills(UUID) remains authoritative
 * for persisted skill calculations and database writes. Nothing in this
 * TypeScript layer re-grades answers or duplicates that processing.
 */

/** Initial normalized skill codes (Phase 2A catalog). */
export const SKILL_CODES = [
  'COMM',
  'CRT',
  'PROB',
  'TEAM',
  'TIME',
  'ADAPT',
  'PROF',
] as const;

export type SkillCode = (typeof SKILL_CODES)[number];

/** Minimum distinct applicable questions required for a valid formal skill snapshot. */
export const MIN_APPLICABLE_QUESTIONS_FOR_VALID_SNAPSHOT = 3;

/** Row shape of the `skills` catalog table. */
export interface Skill {
  id: string;
  code: SkillCode | string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

/** Row shape of the `question_skills` mapping table. */
export interface QuestionSkill {
  id: string;
  question_id: string;
  skill_id: string;
  weight: number;
  created_at: string;
}

/** Row shape of the `student_skill_snapshots` table (per attempt, per skill). */
export interface StudentSkillSnapshot {
  id: string;
  student_id: string;
  skill_id: string;
  attempt_id: string;
  applicable_question_count: number;
  weighted_obtained: number;
  weighted_total: number;
  proficiency: number | null;
  is_valid: boolean;
  processed_at: string;
  created_at: string;
}

/** Row shape of the `student_skill_summaries` table (current proficiency per student/skill). */
export interface StudentSkillSummary {
  id: string;
  student_id: string;
  skill_id: string;
  current_proficiency: number | null;
  last_valid_snapshot_id: string | null;
  last_attempt_id: string | null;
  applicable_question_count: number;
  updated_at: string;
}

/**
 * Already-graded evidence for one question, mapped to one skill.
 * Used by the pure evaluator for preview/testing purposes only —
 * this shape mirrors, but does not drive, the authoritative SQL calculation.
 */
export interface SkillMappingInput {
  questionId: string;
  skillId: string;
  weight: number;
  marksAwarded: number;
  questionMarks: number;
}

/** Result of evaluating one skill's proficiency from a set of graded evidence. */
export interface SkillScoreResult {
  skillId: string;
  applicableQuestionCount: number;
  weightedObtained: number;
  weightedTotal: number;
  proficiency: number | null;
  isValid: boolean;
}

/** Result returned by processAttemptSkills(). */
export type ProcessAttemptSkillsResult =
  | { success: true }
  | { success: false; error: string };