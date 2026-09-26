import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MAX_AUDIO_BYTES, MAX_TRANSCRIPT_CHARS, getQuestion } from '@/lib/voice-coach/practice';
import { validPracticeWav } from '@/lib/voice-coach/wav';
import { dailyLimits, generateFeedback, speak, transcribeAudio, voiceCoachConfigured, VoiceProviderError } from '@/lib/voice-coach/provider';

export const runtime = 'nodejs';
export const maxDuration = 90;

function reply(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function limitedForm(request: Request): Promise<FormData> {
  const limit = MAX_AUDIO_BYTES + 16384;
  if (Number(request.headers.get('content-length')) > limit) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body }).formData();
}

export async function POST(request: Request) {
  // A JSON/API route does not inherit Server Action origin checks.
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Please use the coach from this platform.' }, 403);
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: 'Sign in to your student account first.' }, 401);
    const [{ data: profile, error: profileError }, { data: student, error: studentError }] = await Promise.all([
      client.from('profiles').select('role,status').eq('user_id', user.id).maybeSingle(),
      client.from('students').select('id,status').eq('user_id', user.id).maybeSingle(),
    ]);
    if (profileError || studentError) return reply({ error: 'Student access could not be checked.' }, 503);
    if (profile?.role !== 'STUDENT' || profile.status !== 'ACTIVE' || student?.status !== 'ACTIVE') return reply({ error: 'An active student account is required.' }, 403);
    const { data: allowed, error: accessError } = await client.rpc('fn_has_learning_access');
    if (accessError) return reply({ error: 'Programme access could not be checked.' }, 503);
    if (allowed !== true) return reply({ error: 'Active programme access is required for voice practice.' }, 403);
    if (!voiceCoachConfigured()) return reply({ error: 'Voice practice has not been enabled yet.' }, 503);

    let form: FormData;
    try { form = await limitedForm(request); } catch { return reply({ error: 'Please send a short recording (up to 45 seconds) or a typed answer.' }, 400); }
    if (form.get('consent') !== 'voice-coach-v1') return reply({ error: 'Please agree to AI processing before practising.' }, 400);
    const scenario = String(form.get('scenario') || '');
    const indexText = String(form.get('question') || '');
    const index = /^\d$/.test(indexText) ? Number(indexText) : -1;
    const question = getQuestion(scenario, index);
    const action = form.get('action');
    if (!question || !['question', 'answer', 'text'].includes(String(action))) return reply({ error: 'Choose a valid practice question.' }, 400);
    let transcript = '';
    let audio: File | null = null;
    if (action === 'text') {
      const value = form.get('answer');
      if (typeof value !== 'string' || !value.trim() || value.length > MAX_TRANSCRIPT_CHARS) return reply({ error: 'Enter an answer of 1–3000 characters.' }, 400);
      transcript = value.trim();
    } else if (action === 'answer') {
      const value = form.get('audio');
      if (!(value instanceof File) || value.size > MAX_AUDIO_BYTES || !validPracticeWav(await value.arrayBuffer())) return reply({ error: 'The recording is invalid or longer than 45 seconds. Please record it again.' }, 400);
      audio = new File([await value.arrayBuffer()], 'practice.wav', { type: 'audio/wav' });
    }
    const limits = dailyLimits();
    const { data: quota, error: quotaError } = await createServiceClient().rpc('fn_reserve_voice_coach_request', {
      p_user_id: user.id, p_student_limit: limits.student, p_platform_limit: limits.platform,
    });
    if (quotaError || !quota || typeof quota.allowed !== 'boolean') return reply({ error: 'Practice usage could not be checked. Please contact platform support.' }, 503);
    if (!quota.allowed) {
      const error = quota.reason === 'cooldown' ? 'Please wait five seconds before trying again.'
        : quota.reason === 'student_limit' ? 'You have used today’s practice requests. They reset at midnight India time.'
          : 'Today’s platform voice allowance has been used. Please try again tomorrow.';
      return reply({ error }, 429);
    }
    if (action === 'question') {
      return reply({ audio: await speak(`${question.en} ${question.kn}`, request.signal), remaining: quota.remaining });
    }
    if (audio) transcript = await transcribeAudio(audio, request.signal);
    const feedback = await generateFeedback(question.en, transcript, request.signal);
    const nextQuestion = getQuestion(scenario, index + 1);
    let speech: string | null = null;
    try {
      speech = await speak(`${feedback.strength} ${feedback.kannadaExplanation} Here is a natural English version. ${feedback.improvedEnglish} ${feedback.practiceTip} ${nextQuestion ? `When you are ready, choose the next question. ${nextQuestion.en}` : 'You have finished this practice set. You can retry any answer.'}`, request.signal);
    } catch { /* Keep useful written feedback if speech generation alone fails. */ }
    return reply({ transcript, feedback, audio: speech, remaining: quota.remaining,
      ...(speech ? {} : { audioWarning: 'Audio is unavailable for this response. Your written feedback is ready below.' }) });
  } catch (error) {
    return reply({ error: error instanceof VoiceProviderError ? error.message : 'The coach could not complete this request. Please try again later.' }, 503);
  }
}
