'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_RECORDING_SECONDS, MAX_TRANSCRIPT_CHARS, scenarios, type CoachFeedback } from '@/lib/voice-coach/practice';
import { encodeWav } from '@/lib/voice-coach/wav';

type Phase = 'ready' | 'microphone' | 'recording' | 'preparing' | 'working';
type Result = { transcript?: string; feedback?: CoachFeedback; audio?: string | null; remaining?: number; audioWarning?: string; error?: string };

export default function VoiceCoach({ enabled, dailyLimit }: { enabled: boolean; dailyLimit: number }) {
  const [scenarioId, setScenarioId] = useState<string>('introduction');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [phase, setPhase] = useState<Phase>('ready');
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioElement = useRef<HTMLAudioElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const playbackUrl = useRef('');
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const question = scenario.questions[questionIndex];
  const busy = phase !== 'ready';
  const canPractise = enabled && consent && remaining !== 0;

  const stopTracks = useCallback(() => {
    microphone.current?.getTracks().forEach(track => track.stop());
    microphone.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    if (ticker.current) clearInterval(ticker.current);
    timeout.current = null; ticker.current = null;
  }, []);

  const clearPlayback = useCallback(() => {
    audioElement.current?.pause();
    if (playbackUrl.current) URL.revokeObjectURL(playbackUrl.current);
    playbackUrl.current = '';
  }, []);

  const cancel = useCallback(() => {
    generation.current++;
    request.current?.abort(); request.current = null;
    if (recorder.current) {
      recorder.current.onstop = null;
      recorder.current.ondataavailable = null;
      recorder.current.onerror = null;
      if (recorder.current.state !== 'inactive') recorder.current.stop();
      recorder.current = null;
    }
    stopTracks(); clearPlayback();
    if (audioContext.current && audioContext.current.state !== 'closed') void audioContext.current.close().catch(() => {});
    audioContext.current = null;
  }, [stopTracks, clearPlayback]);

  useEffect(() => {
    const leave = () => cancel();
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); cancel(); };
  }, [cancel]);

  function clearPractice() {
    cancel(); setClip(null); setAnswer(''); setResult(null); setMessage(''); setAudioUrl(''); setPhase('ready'); setSeconds(0);
  }

  async function play(base64: string) {
    clearPlayback();
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    playbackUrl.current = url; setAudioUrl(url);
    if (audioElement.current) {
      audioElement.current.src = url;
      try { await audioElement.current.play(); }
      catch { setMessage('Your response is ready. Press Play below to hear it.'); }
    }
  }

  async function submit(action: 'question' | 'answer' | 'text') {
    if (!canPractise || busy) return;
    const id = ++generation.current;
    setPhase('working'); setMessage(''); clearPlayback(); setAudioUrl('');
    if (action !== 'question') setResult(null);
    const controller = new AbortController(); request.current = controller;
    const deadline = setTimeout(() => controller.abort(), 85000);
    const form = new FormData();
    form.set('action', action); form.set('scenario', scenarioId); form.set('question', String(questionIndex));
    form.set('consent', 'voice-coach-v1');
    if (action === 'answer' && clip) form.set('audio', clip, 'practice.wav');
    if (action === 'text') form.set('answer', answer);
    try {
      const response = await fetch('/api/voice-coach', { method: 'POST', body: form, signal: controller.signal });
      if (id !== generation.current) return;
      const data: Result = await response.json();
      if (id !== generation.current) return;
      if (!response.ok) throw new Error(data.error || 'The coach is unavailable. Please try again.');
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      if (data.feedback) { setResult(data); setClip(null); setAnswer(data.transcript || ''); }
      if (data.audioWarning) setMessage(data.audioWarning);
      if (data.audio) await play(data.audio);
    } catch (error) {
      if (id === generation.current) setMessage(error instanceof Error && error.name !== 'AbortError' ? error.message : 'The request timed out. Please try again later.');
    } finally {
      clearTimeout(deadline);
      if (id === generation.current) { request.current = null; setPhase('ready'); }
    }
  }

  async function startRecording() {
    if (!canPractise || busy) return;
    setMessage(''); setClip(null); clearPlayback(); setAudioUrl('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Microphone recording needs a supported browser on HTTPS (or localhost on this computer). You can type your answer instead.'); return;
    }
    const id = ++generation.current;
    setPhase('microphone');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onerror = () => { if (id === generation.current) { cancel(); setPhase('ready'); setMessage('Recording failed. Try again or type your answer.'); } };
      capture.onstop = async () => {
        stopTracks(); recorder.current = null;
        if (id !== generation.current) return;
        setPhase('preparing');
        let context: AudioContext | null = null;
        try {
          const encoded = new Blob(chunks, { type: capture.mimeType });
          context = new AudioContext(); audioContext.current = context;
          const decoded = await context.decodeAudioData(await encoded.arrayBuffer());
          const length = Math.min(Math.floor(decoded.duration * 16000), MAX_RECORDING_SECONDS * 16000);
          if (length < 4000) throw new Error('Please record at least a short sentence.');
          const offline = new OfflineAudioContext(1, length, 16000);
          const source = offline.createBufferSource(); source.buffer = decoded;
          source.connect(offline.destination); source.start();
          const pcm = await offline.startRendering();
          if (id === generation.current) setClip(new Blob([encodeWav(pcm.getChannelData(0))], { type: 'audio/wav' }));
        } catch {
          if (id === generation.current) setMessage('We could not prepare that recording. Try a longer answer or use the typed option.');
        } finally {
          if (context && context.state !== 'closed') await context.close().catch(() => {});
          if (audioContext.current === context) audioContext.current = null;
          if (id === generation.current) setPhase('ready');
        }
      };
      capture.start(); setSeconds(0); setPhase('recording');
      const started = Date.now();
      ticker.current = setInterval(() => setSeconds(Math.min(MAX_RECORDING_SECONDS, Math.floor((Date.now() - started) / 1000))), 250);
      timeout.current = setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      stopTracks();
      if (id === generation.current) { setPhase('ready'); setMessage('Microphone access was not available. Allow it in your browser, or type your answer.'); }
    }
  }

  const feedback = result?.feedback;
  return <div className="mt-6 space-y-5">
    <section aria-label="Choose a practice situation" className="grid gap-3 sm:grid-cols-3">
      {scenarios.map(item => <button key={item.id} type="button" disabled={busy} aria-pressed={scenarioId === item.id}
        onClick={() => { clearPractice(); setScenarioId(item.id); setQuestionIndex(0); }}
        className={`rounded-xl border p-4 text-left ${scenarioId === item.id ? 'ring-2 ring-slate-800' : ''}`}>
        <span className="block font-semibold">{item.title}</span><span className="mt-1 block text-sm">{item.description}</span>
      </button>)}
    </section>

    <section className="rounded-xl border bg-white p-5 sm:p-6">
      <p className="text-sm text-slate-600">Question {questionIndex + 1} of {scenario.questions.length}</p>
      <h2 className="mt-2 text-xl font-semibold">{question.en}</h2>
      <p lang="kn" className="mt-3 leading-relaxed">{question.kn}</p>
      <p className="mt-4 text-sm text-slate-600">Read or listen → record or type → send your answer → hear feedback → retry or move to the next question.</p>
      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
        <p>You are practising with an AI coach. The voice is AI-generated, with a requested Indian English speaking style. Kannada and accent quality may vary.</p>
        <p className="mt-2">Feedback is based on the words recognised in your answer. It does not measure pronunciation or change your official skill scores.</p>
        <label className="mt-3 flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={event => { setConsent(event.target.checked); if (!event.target.checked) clearPractice(); }} />
          <span>I agree to send my submitted recording or typed answer to OpenAI for transcription, coaching and voice playback. This platform does not save recordings or conversations. Avoid personal or confidential information. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer" className="underline">Provider data handling</a></span>
        </label>
      </div>
      <button type="button" disabled={!canPractise || busy} onClick={() => void submit('question')} className="mt-4 rounded-lg px-4 py-3">Listen to the question</button>
      <fieldset disabled={busy} className="mt-5 flex flex-wrap gap-4">
        <legend className="mb-2 font-medium">How would you like to answer?</legend>
        <label className="flex items-center gap-2"><input type="radio" name="answer-mode" checked={mode === 'voice'} onChange={() => setMode('voice')} />Speak</label>
        <label className="flex items-center gap-2"><input type="radio" name="answer-mode" checked={mode === 'text'} onChange={() => setMode('text')} />Type or correct transcript</label>
      </fieldset>
      {mode === 'voice' ? <div className="mt-4">
        <p className="text-sm">Up to 45 seconds per answer. Your microphone stops when the recording ends. Audio is sent only when you press Send answer.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {phase === 'recording' ? <button type="button" onClick={() => recorder.current?.stop()} className="rounded-lg px-4 py-3">Finish recording ({seconds}s)</button>
            : <button type="button" disabled={!canPractise || busy} onClick={() => void startRecording()} className="rounded-lg px-4 py-3">{clip ? 'Record again' : 'Record answer'}</button>}
          <button type="button" disabled={!canPractise || busy || !clip} onClick={() => void submit('answer')} className="rounded-lg px-4 py-3">Send answer</button>
        </div>
        {clip && <p className="mt-2 text-sm">Recording ready to send.</p>}
      </div> : <div className="mt-4">
        <label htmlFor="coach-answer" className="block font-medium">Your answer in Kannada, English or both</label>
        <textarea id="coach-answer" value={answer} disabled={busy} maxLength={MAX_TRANSCRIPT_CHARS} onChange={event => setAnswer(event.target.value)} rows={5} className="mt-2 w-full rounded-lg border p-3" />
        <button type="button" disabled={!canPractise || busy || !answer.trim()} onClick={() => void submit('text')} className="mt-3 rounded-lg px-4 py-3">Get feedback</button>
      </div>}
      <p role="status" className="mt-4 text-sm">{phase === 'microphone' ? 'Waiting for microphone permission…' : phase === 'recording' ? 'Microphone is recording.' : phase === 'preparing' ? 'Preparing your recording…' : phase === 'working' ? 'The coach is preparing your response…' : ''}</p>
      {message && <p role="alert" className="mt-3 rounded-lg border p-3">{message}</p>}
      <div className={audioUrl ? 'mt-4' : 'hidden'}>
        <p className="mb-2 text-sm">Coach voice — AI-generated</p>
        <audio ref={audioElement} src={audioUrl || undefined} controls className="w-full" aria-label="Coach response audio" />
      </div>
      <p className="mt-4 text-xs text-slate-600">{remaining === null ? `Up to ${dailyLimit} requests a day.` : `${remaining} requests remaining today.`} Listening to a question or requesting feedback uses one request. Failed provider requests may count. Limits reset at midnight India time.</p>
    </section>

    {feedback && <section aria-label="Your practice feedback" className="rounded-xl border bg-white p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Your practice feedback</h2>
      <details className="mt-4"><summary className="cursor-pointer font-medium">What the coach understood</summary><p className="mt-2 whitespace-pre-wrap">{result?.transcript}</p><p className="mt-2 text-sm">If this is inaccurate, choose “Type or correct transcript” above before asking for feedback again.</p></details>
      <h3 className="mt-5 font-semibold">What worked</h3><p className="mt-1 whitespace-pre-wrap">{feedback.strength}</p>
      <h3 className="mt-4 font-semibold">One thing to improve</h3><p className="mt-1 whitespace-pre-wrap">{feedback.improvement}</p>
      <h3 className="mt-4 font-semibold">Try saying it this way</h3><p className="mt-2 rounded-lg bg-green-50 p-4 whitespace-pre-wrap">{feedback.improvedEnglish}</p>
      <h3 className="mt-4 font-semibold">Explanation in Kannada</h3><p lang="kn" className="mt-2 leading-relaxed whitespace-pre-wrap">{feedback.kannadaExplanation}</p>
      <h3 className="mt-4 font-semibold">Practise again</h3><p className="mt-1 whitespace-pre-wrap">{feedback.practiceTip}</p>
    </section>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || questionIndex === 0} onClick={() => { clearPractice(); setQuestionIndex(questionIndex - 1); }} className="rounded-lg px-4 py-3">Previous question</button>
      <button type="button" disabled={busy || questionIndex === scenario.questions.length - 1} onClick={() => { clearPractice(); setQuestionIndex(questionIndex + 1); }} className="rounded-lg px-4 py-3">Next question</button>
      <button type="button" onClick={clearPractice} className="rounded-lg px-4 py-3">{busy ? 'Cancel and clear practice' : 'Clear practice'}</button>
    </div>
    <p className="text-sm text-slate-600">AI feedback can be mistaken. Your recording and this conversation are cleared from the page when you leave or choose Clear practice. Only usage counts are saved by the platform.</p>
  </div>;
}
