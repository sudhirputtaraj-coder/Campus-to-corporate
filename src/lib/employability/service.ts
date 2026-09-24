'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  BreakdownItem,
  CollegeAnalyticsSummary,
  EmployabilityResult,
  Recommendation,
  SkillGapItem,
} from './types';

/** Recompute employability for a student (RPC). */
export async function computeEmployabilityScore(
  studentId: string
): Promise<EmployabilityResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_compute_employability_score', {
    p_student_id: studentId,
  });

  if (error || !data) {
    console.error('fn_compute_employability_score', error);
    return {
      student_id: studentId,
      score: 0,
      classification_code: null,
      classification_label: null,
      is_provisional: true,
      skills_measured: 0,
      skills_weighted: 0,
      breakdown: [],
      error: 'Unable to compute employability score.',
    };
  }

  const result = data as EmployabilityResult;
  return {
    student_id: result.student_id ?? studentId,
    score: Number(result.score) || 0,
    classification_code: result.classification_code ?? null,
    classification_label: result.classification_label ?? null,
    is_provisional: Boolean(result.is_provisional),
    skills_measured: Number(result.skills_measured) || 0,
    skills_weighted: Number(result.skills_weighted) || 0,
    breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
    history_id: result.history_id,
  };
}

/** Latest stored score + breakdown for a student (no recompute). */
export async function getLatestEmployability(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('student_employability_scores')
    .select('*')
    .eq('student_id', studentId)
    .order('computed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    score: Number(data.score) || 0,
    classification_code: data.classification_code as string | null,
    classification_label: data.classification_label as string | null,
    is_provisional: Boolean(data.is_provisional),
    skills_measured: Number(data.skills_measured) || 0,
    skills_weighted: Number(data.skills_weighted) || 0,
    breakdown: (data.breakdown || []) as BreakdownItem[],
    computed_at: data.computed_at as string,
  };
}

/** Skill gaps sorted by largest gap first. */
export async function getSkillGaps(studentId: string): Promise<SkillGapItem[]> {
  const latest = await getLatestEmployability(studentId);
  if (latest?.breakdown?.length) {
    return latest.breakdown
      .filter((b) => b.included && b.gap != null && b.gap > 0)
      .map((b) => ({
        skill_id: b.skill_id,
        code: b.code,
        name: b.name,
        proficiency: b.proficiency,
        target: b.target,
        gap: Number(b.gap) || 0,
        weight_percent: b.weight_percent,
      }))
      .sort((a, b) => b.gap - a.gap || a.name.localeCompare(b.name));
  }

  // Fallback: build from summaries + targets
  const supabase = await createClient();
  const { data: weights } = await supabase
    .from('employability_score_weights')
    .select('skill_id, weight_percent, skill:skills(id, code, name)')
    .eq('is_active', true);

  const { data: summaries } = await supabase
    .from('student_skill_summaries')
    .select('skill_id, current_proficiency')
    .eq('student_id', studentId);

  const { data: targets } = await supabase.from('skill_gap_targets').select('skill_id, target_proficiency');

  const sumMap = new Map((summaries || []).map((s) => [s.skill_id, s.current_proficiency]));
  const tgtMap = new Map((targets || []).map((t) => [t.skill_id, Number(t.target_proficiency)]));

  const gaps: SkillGapItem[] = [];
  for (const w of weights || []) {
    const skill = w.skill as any;
    if (!skill) continue;
    const prof = sumMap.get(w.skill_id);
    if (prof == null) continue;
    const target = tgtMap.get(w.skill_id) ?? 70;
    const gap = Math.max(0, target - Number(prof));
    if (gap > 0) {
      gaps.push({
        skill_id: w.skill_id,
        code: skill.code,
        name: skill.name,
        proficiency: Number(prof),
        target,
        gap,
        weight_percent: Number(w.weight_percent),
      });
    }
  }
  return gaps.sort((a, b) => b.gap - a.gap);
}

/** Database aggregates all authorised students, using their latest valid final score. */
export async function getCollegeAnalytics(): Promise<CollegeAnalyticsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_learning_analytics');
  if (error || !data) throw new Error('Analytics are unavailable. Check database setup and try again.');
  return data as CollegeAnalyticsSummary;
}
