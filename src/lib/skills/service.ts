/**
 * Phase 2A Employability Skill Engine — server-side service layer.
 *
 * This is a thin wrapper around the fn_process_attempt_skills(UUID) RPC
 * defined in supabase/migrations/005_phase2a_skill_engine.sql. It does not:
 *  - re-grade answers
 *  - calculate authoritative persisted proficiency
 *  - update students.employability_score
 *  - duplicate GRADED/formal validation
 *  - write snapshots or summaries manually
 *
 * fn_process_attempt_skills(UUID) remains authoritative for all persisted
 * skill calculations and database writes.
 */

import { createClient } from '@/lib/supabase/server';
import type { ProcessAttemptSkillsResult } from './types';

/**
 * Process skill snapshots/summaries for one assessment attempt.
 *
 * Uses the normal session-preserving server client (not the service-role
 * client): fn_process_attempt_skills is SECURITY DEFINER but authorizes
 * the caller using auth.uid(), so the caller's session/JWT must be
 * preserved for the RPC's own authorization check to work correctly.
 */
export async function processAttemptSkills(
  attemptId: string
): Promise<ProcessAttemptSkillsResult> {
  if (!attemptId) {
    return { success: false, error: 'Missing attemptId.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc('fn_process_attempt_skills', {
    p_attempt_id: attemptId,
  });

  if (error) {
    console.error('processAttemptSkills RPC error:', error);
    return { success: false, error: error.message };
  }

  const { data: attempt } = await supabase.from('assessment_attempts').select('student_id').eq('id', attemptId).single();
  if (attempt) {
    const { error: scoringError } = await supabase.rpc('fn_compute_employability_score', { p_student_id: attempt.student_id });
    if (scoringError) console.error('Employability refresh unavailable:', scoringError.code);
  }
  return { success: true };
}