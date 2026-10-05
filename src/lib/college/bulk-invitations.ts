'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collegeDirectoryAccess } from './student-directory';
import { createServiceClient } from '@/lib/supabase/server';
import { validateRoster, rosterFromText } from './roster';
import { fillRosterDefaults, parseRosterFile } from './roster-file';
import { invitationEmailConfig, deliverInvitation } from './invitation-email';

async function authorized(collegeId: string) {
  if (!z.string().uuid().safeParse(collegeId).success) throw Error('Choose a college.');
  const access = await collegeDirectoryAccess();
  if (!access || (access.collegeIds !== null && !access.collegeIds.includes(collegeId))) throw Error('Active administrator access to this college is required.');
  return access;
}
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Could not complete this step. Try again.';
export async function previewStudentRoster(collegeId: string, form: FormData) {
  try {
    await authorized(collegeId);
    const file = form.get('file');
    const rows = file instanceof File && file.size ? await (async () => {
      if (file.size > 2 * 1024 * 1024) throw Error('Use a file smaller than 2 MB.');
      return parseRosterFile(file.name, Buffer.from(await file.arrayBuffer()));
    })() : rosterFromText(String(form.get('emails') || ''));
    const result = fillRosterDefaults(rows);
    // Invalid rows stay visible and editable. Send performs strict validation again.
    return { ...result, error: '' };
  } catch (e) { return { rows: [], generated: 0, error: errorText(e) }; }
}
export async function queueStudentInvitations(collegeId: string, rows: unknown, departmentId: string, batchId: string) {
  try {
    const access = await authorized(collegeId);
    if (!invitationEmailConfig()) throw Error('Email sending is not configured. Ask the platform administrator to configure a Gmail account with an App Password (or a verified Resend sender), and a public HTTPS app address.');
    const placement = z.union([z.literal(''), z.string().uuid()]);
    if (!placement.safeParse(departmentId).success || !placement.safeParse(batchId).success) throw Error('Choose valid placement options.');
    const clean = validateRoster(rows).map(r => ({ ...r, department_id: departmentId, batch_id: batchId }));
    const result = await access.client.rpc('fn_bulk_invite_students', { p_college_id: collegeId, p_rows: clean });
    if (result.error) throw Error(result.error.code === 'P0001' ? result.error.message : 'Bulk invitations could not be saved. Check that migration 040 has been applied.');
    revalidatePath('/college/students/access'); revalidatePath('/join');
    return { results: result.data as ImportResult[], error: '' };
  } catch (e) { return { results: [] as ImportResult[], error: errorText(e) }; }
}
export type ImportResult = { row: number; email: string; status: string; message: string };
export type MailJob = { id: string; status: string; attempts: number; detail: string | null; updated_at: string; college_student_invitations: { email: string } | null };
export async function invitationQueue(collegeId: string) {
  try {
    const access = await authorized(collegeId);
    const [pending, sent] = await Promise.all([
      access.client.from('college_invitation_mail').select('id,status,attempts,detail,updated_at,college_student_invitations(email)').eq('college_id', collegeId).neq('status','SENT').neq('status','CANCELLED').order('created_at').limit(500),
      access.client.from('college_invitation_mail').select('id', { count: 'exact', head: true }).eq('college_id', collegeId).eq('status','SENT'),
    ]);
    if (pending.error || sent.error) throw Error('Apply migration 040 to enable the saved invitation queue.');
    return { jobs: pending.data as unknown as MailJob[], sent: sent.count || 0, configured: !!invitationEmailConfig(), error: '' };
  } catch (e) { return { jobs: [] as MailJob[], sent: 0, configured: false, error: errorText(e) }; }
}
export async function sendStudentInvitation(collegeId: string, jobId: string) {
  try {
    await authorized(collegeId);
    if (!z.string().uuid().safeParse(jobId).success) throw Error('Invalid invitation.');
    const config = invitationEmailConfig();
    if (!config) throw Error('Email sender is not configured.');
    const service = createServiceClient();
    const claim = await service.rpc('fn_claim_college_invitation_mail', { p_college_id: collegeId, p_id: jobId });
    if (claim.error) throw Error('Could not claim invitation. Refresh the queue and try again.');
    if (!claim.data) return { status: 'SKIPPED', error: '' };
    const outcome = await deliverInvitation(config, claim.data);
    const saved = await service.from('college_invitation_mail').update({ ...outcome, updated_at: new Date().toISOString() }).eq('id',jobId).eq('college_id',collegeId).eq('status','SENDING');
    if (saved.error) throw Error('Email result could not be saved. Check the provider before trying again.');
    return { status: outcome.status, error: '' };
  } catch (e) { return { status: 'ERROR', error: errorText(e) }; }
}
