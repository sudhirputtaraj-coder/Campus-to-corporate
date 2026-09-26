import 'server-only';
import { coachInstructions, feedbackSchema, parseFeedback, type CoachFeedback } from './practice';

type VoiceEnvironment = Record<string, string | undefined>;
export function voiceCoachConfigured(env: VoiceEnvironment = process.env) {
  return env.VOICE_COACH_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY?.trim());
}

export function dailyLimits(env: VoiceEnvironment = process.env) {
  const limit = (value: string | undefined, fallback: number, max: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
  };
  return { student: limit(env.VOICE_COACH_DAILY_REQUESTS, 20, 100), platform: limit(env.VOICE_COACH_PLATFORM_DAILY_REQUESTS, 200, 10000) };
}

export class VoiceProviderError extends Error {}

async function providerFetch(path: string, body: BodyInit, json: boolean, signal?: AbortSignal) {
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body, cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new VoiceProviderError('The voice service is unavailable. Please try again later.');
  return response;
}

export async function transcribeAudio(audio: File, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.set('file', audio);
  form.set('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
  // Leave language detection enabled: students may switch between Kannada and English.
  form.set('prompt', 'Workplace communication practice in Kannada and English. Preserve the original languages; do not translate.');
  const response = await providerFetch('audio/transcriptions', form, false, signal);
  const data = await response.json();
  if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 3000) {
    throw new VoiceProviderError('We could not get a clear, short transcript. Please record again or type your answer.');
  }
  return data.text.trim();
}

export async function generateFeedback(question: string, transcript: string, signal?: AbortSignal): Promise<CoachFeedback> {
  const response = await providerFetch('responses', JSON.stringify({
    model: process.env.OPENAI_COACH_MODEL || 'gpt-4.1-mini', store: false,
    instructions: coachInstructions,
    input: [{ role: 'user', content: JSON.stringify({ practiceQuestion: question, studentTranscript: transcript }) }],
    max_output_tokens: 1800,
    text: { format: { type: 'json_schema', name: 'communication_feedback', strict: true, schema: feedbackSchema } },
  }), true, signal);
  const data = await response.json();
  if (data.status !== 'completed' || !Array.isArray(data.output)) throw new VoiceProviderError('Feedback was incomplete. Please try again.');
  const pieces: string[] = [];
  for (const item of data.output) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) if (part.type === 'output_text' && typeof part.text === 'string') pieces.push(part.text);
  }
  let feedback: CoachFeedback | null = null;
  try { feedback = parseFeedback(JSON.parse(pieces.join(''))); } catch { /* Do not expose provider payloads. */ }
  if (!feedback) throw new VoiceProviderError('The coach could not give useful feedback for that answer. Please try a workplace example.');
  return feedback;
}

export async function speak(text: string, signal?: AbortSignal): Promise<string> {
  const response = await providerFetch('audio/speech', JSON.stringify({
    model: process.env.OPENAI_SPEECH_MODEL || 'gpt-4o-mini-tts', voice: 'coral',
    input: text.slice(0, 4000), response_format: 'mp3',
    instructions: 'You are a warm, patient bilingual Kannada-English coach. Use clear, natural Indian English pronunciation, not a caricature. Read Kannada passages naturally in Kannada. Speak at a moderate teaching pace and pause briefly between explanations and English examples. Read the supplied text only.',
  }), true, signal);
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}
