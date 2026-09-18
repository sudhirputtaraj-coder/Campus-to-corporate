import { SKILL_CODES } from './types';

export interface DashboardSkill {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface DashboardSummary {
  skill_id: string;
  current_proficiency: number | null;
  last_valid_snapshot_id: string | null;
  last_attempt_id: string | null;
}

export interface DashboardAttempt {
  id: string;
  attempt_number: number;
  completed_at: string | null;
  created_at: string;
  assessment: { title: string; is_practice: boolean };
}

export interface DashboardSnapshot {
  id: string;
  skill_id: string;
  attempt_id: string;
  proficiency: number | null;
  applicable_question_count: number;
  is_valid: boolean;
}

/** Read-only presentation model. Never calculates or persists proficiency. */
export function buildSkillCards(
  skills: DashboardSkill[],
  summaries: DashboardSummary[],
  snapshots: DashboardSnapshot[],
  attempts: DashboardAttempt[],
  recentAttemptIds: string[],
) {
  const attemptById = new Map(attempts.map(attempt => [attempt.id, attempt]));
  const recentIds = new Set(recentAttemptIds);
  const skillOrder: readonly string[] = SKILL_CODES;
  const order = (code: string) => {
    const index = skillOrder.indexOf(code);
    return index < 0 ? skillOrder.length : index;
  };

  return [...skills]
    .sort((a, b) => order(a.code) - order(b.code) || a.name.localeCompare(b.name))
    .map(skill => {
      const summary = summaries.find(row => row.skill_id === skill.id);
      const measurements = snapshots
        .filter(row => row.skill_id === skill.id)
        .flatMap(snapshot => {
          const attempt = attemptById.get(snapshot.attempt_id);
          if (!attempt || attempt.assessment.is_practice) return [];
          return [{ ...snapshot, attempt }];
        });
      const source = measurements.find(row =>
        row.id === summary?.last_valid_snapshot_id &&
        row.attempt_id === summary?.last_attempt_id && row.is_valid,
      );
      const hasScore = summary?.current_proficiency != null;
      const score = hasScore && source ? Number(summary.current_proficiency) : null;
      const scoreAvailable = score !== null && Number.isFinite(score) && score >= 0 && score <= 100;
      const history = measurements
        .filter(row => recentIds.has(row.attempt_id))
        .sort((a, b) =>
          Date.parse(b.attempt.completed_at ?? b.attempt.created_at) -
          Date.parse(a.attempt.completed_at ?? a.attempt.created_at) ||
          b.id.localeCompare(a.id),
        );

      return {
        ...skill,
        score: scoreAvailable ? score : null,
        source: scoreAvailable ? source : undefined,
        unavailable: hasScore && !scoreAvailable,
        history,
      };
    });
}
