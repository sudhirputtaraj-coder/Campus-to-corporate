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

  if (error) {
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

/** College-scoped analytics from real student scores (RLS applies). */
export async function getCollegeAnalytics(): Promise<CollegeAnalyticsSummary> {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from('students')
    .select('id, employability_score, department_id, batch_id, department:departments(name), batch:batches(name)')
    .eq('status', 'ACTIVE');

  const list = students || [];
  const total = list.length;
  const withScore = list.filter(
    (s) => s.employability_score != null && Number(s.employability_score) > 0
  );
  const avg =
    withScore.length > 0
      ? Math.round(
          (withScore.reduce((a, s) => a + Number(s.employability_score), 0) / withScore.length) * 100
        ) / 100
      : null;

  // Classification counts from latest history where available
  const studentIds = list.map((s) => s.id);
  const classification_counts: Record<string, number> = {};

  if (studentIds.length > 0) {
    const { data: scores } = await supabase
      .from('student_employability_scores')
      .select('student_id, classification_label, computed_at')
      .in('student_id', studentIds)
      .order('computed_at', { ascending: false });

    const seen = new Set<string>();
    for (const row of scores || []) {
      if (seen.has(row.student_id)) continue;
      seen.add(row.student_id);
      const label = row.classification_label || 'Unclassified';
      classification_counts[label] = (classification_counts[label] || 0) + 1;
    }
  }

  // Department averages
  const deptMap = new Map<string, { name: string; sum: number; n: number }>();
  for (const s of withScore) {
    const key = s.department_id || 'none';
    const name = (s.department as any)?.name || 'Unassigned';
    const cur = deptMap.get(key) || { name, sum: 0, n: 0 };
    cur.sum += Number(s.employability_score);
    cur.n += 1;
    deptMap.set(key, cur);
  }
  const department_averages = [...deptMap.entries()].map(([id, v]) => ({
    department_id: id === 'none' ? null : id,
    department_name: v.name,
    avg_score: Math.round((v.sum / v.n) * 100) / 100,
    n: v.n,
  }));

  // Batch averages
  const batchMap = new Map<string, { name: string; sum: number; n: number }>();
  for (const s of withScore) {
    const key = s.batch_id || 'none';
    const name = (s.batch as any)?.name || 'Unassigned';
    const cur = batchMap.get(key) || { name, sum: 0, n: 0 };
    cur.sum += Number(s.employability_score);
    cur.n += 1;
    batchMap.set(key, cur);
  }
  const batch_averages = [...batchMap.entries()].map(([id, v]) => ({
    batch_id: id === 'none' ? null : id,
    batch_name: v.name,
    avg_score: Math.round((v.sum / v.n) * 100) / 100,
    n: v.n,
  }));

  // Top skill gaps across college (from latest breakdowns — sample recent scores)
  const gapAgg = new Map<string, { name: string; sum: number; n: number }>();
  if (studentIds.length > 0) {
    const { data: recent } = await supabase
      .from('student_employability_scores')
      .select('student_id, breakdown, computed_at')
      .in('student_id', studentIds.slice(0, 500))
      .order('computed_at', { ascending: false })
      .limit(500);

    const seen = new Set<string>();
    for (const row of recent || []) {
      if (seen.has(row.student_id)) continue;
      seen.add(row.student_id);
      const breakdown = (row.breakdown || []) as BreakdownItem[];
      for (const b of breakdown) {
        if (!b.included || b.gap == null || b.gap <= 0) continue;
        const cur = gapAgg.get(b.code) || { name: b.name, sum: 0, n: 0 };
        cur.sum += Number(b.gap);
        cur.n += 1;
        gapAgg.set(b.code, cur);
      }
    }
  }

  const top_skill_gaps = [...gapAgg.entries()]
    .map(([code, v]) => ({
      code,
      name: v.name,
      avg_gap: Math.round((v.sum / v.n) * 100) / 100,
      n: v.n,
    }))
    .sort((a, b) => b.avg_gap - a.avg_gap)
    .slice(0, 7);

  return {
    total_students: total,
    students_with_score: withScore.length,
    average_score: avg,
    classification_counts,
    top_skill_gaps,
    department_averages,
    batch_averages,
  };
}
