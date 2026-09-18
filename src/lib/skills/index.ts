/**
 * Phase 2A Employability Skill Engine — public module exports.
 */

export {
  SKILL_CODES,
  MIN_APPLICABLE_QUESTIONS_FOR_VALID_SNAPSHOT,
  type SkillCode,
  type Skill,
  type QuestionSkill,
  type StudentSkillSnapshot,
  type StudentSkillSummary,
  type SkillMappingInput,
  type SkillScoreResult,
  type ProcessAttemptSkillsResult,
} from './types';

export {
  roundSkillPercent,
  evaluateSkillScore,
  evaluateAttemptSkills,
} from './evaluator';

export { processAttemptSkills } from './service';