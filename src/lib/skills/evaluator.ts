/**
 * Phase 2A Employability Skill Engine — pure evaluation utilities.
 *
 * This module is intentionally side-effect free:
 *  - No Supabase dependency
 *  - No Next.js dependency
 *  - No database calls
 *  - No network calls
 *  - No I/O
 *
 * It does NOT grade answers. It receives already-graded marks
 * (marksAwarded, questionMarks) and mirrors the canonical Phase 2A
 * proficiency formula for preview/testing purposes only:
 *
 *   SUM(marksAwarded × weight)
 *   --------------------------- × 100
 *   SUM(questionMarks × weight)
 *
 * The SQL function fn_process_attempt_skills(UUID) in migration 005 is the
 * authoritative source for persisted skill snapshots/summaries. This
 * evaluator must never be used to write skill results to the database.
 */

import {
  MIN_APPLICABLE_QUESTIONS_FOR_VALID_SNAPSHOT,
  type SkillMappingInput,
  type SkillScoreResult,
} from './types';

/** Round a percentage to 2 decimal places, matching the SQL ROUND(..., 2) behavior. */
export function roundSkillPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Evaluate one skill's proficiency from its already-graded evidence entries.
 * `entries` must all share the same skillId; this function does not filter.
 */
export function evaluateSkillScore(
  skillId: string,
  entries: SkillMappingInput[]
): SkillScoreResult {
  const distinctQuestionIds = new Set(entries.map((e) => e.questionId));
  const applicableQuestionCount = distinctQuestionIds.size;

  let weightedObtained = 0;
  let weightedTotal = 0;

  for (const entry of entries) {
    weightedObtained += entry.marksAwarded * entry.weight;
    weightedTotal += entry.questionMarks * entry.weight;
  }

  let proficiency: number | null = null;
  if (weightedTotal > 0) {
    proficiency = roundSkillPercent((weightedObtained / weightedTotal) * 100);
  }

  const isValid =
    applicableQuestionCount >= MIN_APPLICABLE_QUESTIONS_FOR_VALID_SNAPSHOT &&
    weightedTotal > 0;

  return {
    skillId,
    applicableQuestionCount,
    weightedObtained,
    weightedTotal,
    proficiency,
    isValid,
  };
}

/**
 * Group already-graded evidence by skill and evaluate each skill's score.
 * Mirrors the per-skill GROUP BY in fn_process_attempt_skills, for preview/
 * testing only — not authoritative and never persisted directly from here.
 */
export function evaluateAttemptSkills(
  inputs: SkillMappingInput[]
): SkillScoreResult[] {
  const bySkill = new Map<string, SkillMappingInput[]>();

  for (const input of inputs) {
    const existing = bySkill.get(input.skillId);
    if (existing) {
      existing.push(input);
    } else {
      bySkill.set(input.skillId, [input]);
    }
  }

  const results: SkillScoreResult[] = [];
  for (const [skillId, entries] of bySkill) {
    results.push(evaluateSkillScore(skillId, entries));
  }

  return results;
}