import type { Recommendation, SkillGapItem } from './types';

/** Simple, transparent recommendations from gaps (no AI). */
export function buildRecommendations(gaps: SkillGapItem[]): Recommendation[] {
  return gaps.slice(0, 5).map((g) => {
    const priority: Recommendation['priority'] =
      g.gap >= 25 ? 'high' : g.gap >= 12 ? 'medium' : 'low';
    return {
      priority,
      skill_code: g.code,
      skill_name: g.name,
      message:
        g.proficiency == null
          ? `Complete formal assessments covering ${g.name} to establish a baseline.`
          : `Your ${g.name} score is ${Math.round(g.proficiency)}% (target ${g.target}%). Focus on practice modules and related assessments to close a ${Math.round(g.gap)}-point gap.`,
    };
  });
}