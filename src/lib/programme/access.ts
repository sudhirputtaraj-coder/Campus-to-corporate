import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { describeProgrammeAccess, type ProgrammeAccessStatus } from './access-status';

/** Read only the current student's purchase status, using their session and RLS. */
export async function getMyProgrammeAccess(): Promise<ProgrammeAccessStatus | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { state: 'unavailable' };
    const { data: student, error: studentError } = await supabase.from('students')
      .select('id, account_type').eq('user_id', user.id).maybeSingle();
    if (studentError || !student) return { state: 'unavailable' };
    if (student.account_type === 'COLLEGE') return null;
    if (student.account_type !== 'INDIVIDUAL') return { state: 'unavailable' };

    const now = new Date();
    const { data: settings, error: settingsError } = await supabase.from('programme_settings')
      .select('payment_mode').eq('id', 'corporate-readiness').single();
    if (settingsError || !settings?.payment_mode) return { state: 'unavailable' };
    const fields = 'status, activated_at, expires_at, created_at, price_paise, currency, access_months, payment_mode';
    const purchases = () => supabase.from('programme_purchases').select(fields)
      .eq('student_id', student.id).eq('programme_id', 'corporate-readiness').eq('payment_mode', settings.payment_mode);
    // A newer failed/pending order must not hide an older, still-active purchase.
    const [active, latest] = await Promise.all([
      purchases().eq('status', 'PAID').lte('activated_at', now.toISOString())
        .gt('expires_at', now.toISOString()).order('expires_at', { ascending: false }).limit(1),
      purchases().order('created_at', { ascending: false }).limit(1),
    ]);
    if (active.error || latest.error) return { state: 'unavailable' };
    return describeProgrammeAccess([...(active.data ?? []), ...(latest.data ?? [])], now.getTime());
  } catch {
    return { state: 'unavailable' };
  }
}
