import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dailyLimits, voiceCoachConfigured } from '@/lib/voice-coach/provider';
import VoiceCoach from './voice-coach';

export default async function CommunicationCoachPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await client.from('profiles').select('role,status').eq('user_id', user.id).maybeSingle();
  if (profile?.status !== 'ACTIVE') redirect('/login');
  const preview = profile.role === 'SUPER_ADMIN';
  if (profile.role !== 'STUDENT' && !preview) redirect('/');
  let enabled = false;
  let notice = 'The voice coach is being prepared. You can explore the practice questions now; AI feedback will be available once voice setup is complete.';
  if (preview) notice = 'Super Admin preview. Live practice is available only from an active student account after voice setup is complete.';
  else {
    const { data: student } = await client.from('students').select('id,status').eq('user_id', user.id).maybeSingle();
    if (!student) redirect('/student/setup');
    const { data: access, error: accessError } = await client.rpc('fn_has_learning_access');
    if (student.status !== 'ACTIVE' || access !== true || accessError) notice = 'Active programme access is needed for AI practice. Check your programme access on the dashboard.';
    else if (voiceCoachConfigured()) {
      const { error } = await client.from('voice_coach_usage').select('usage_date').limit(1);
      if (!error) { enabled = true; notice = ''; }
    }
  }
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <Link href={preview ? '/admin/dashboard' : '/student/learning'}>{preview ? 'Back to admin dashboard' : 'Back to My Learning Path'}</Link>
    <p className="mt-6 text-sm font-semibold uppercase tracking-wide">Communication practice</p>
    <h1 className="mt-2 text-3xl font-bold">Your Kannada–English Communication Coach</h1>
    <p className="mt-3 text-slate-600">Practise introductions, interviews and workplace conversations. Speak in Kannada, English or both, then learn a clearer way to express your ideas in English.</p>
    <p lang="kn" className="mt-2 text-slate-600">ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ. ಸರಳ ವಿವರಣೆ ಮತ್ತು ಉದಾಹರಣೆಗಳೊಂದಿಗೆ ಅಭ್ಯಾಸ ಮಾಡಿ.</p>
    {notice && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">{notice}</p>}
    <VoiceCoach enabled={enabled} dailyLimit={dailyLimits().student} />
  </main>;
}
