# Kannada–English Communication Coach

Student navigation: My Learning Path → Communication Coach → Assessments. Also linked from the student dashboard. Super Admin can preview `/student/communication-coach`; AI requests require an active student account and current learning access.

## First version

- Three practice situations: introductions, interviews, meetings/updates. Each has three questions in English and Kannada.
- Student listens to a question or reads it, records up to 45 seconds, and explicitly sends the answer. The coach waits until submission. This is turn-based practice, not an always-listening live call.
- Feedback includes a strength, one improvement, an English rewrite, a Kannada explanation and a retry tip. AI-generated audio is prompted to use natural Indian English and Kannada. Validate the actual accent and code-switching with Kannada speakers before release; an exact accent is not guaranteed.
- Typed answers and transcript corrections are supported. Written feedback remains usable if speech generation fails. Mobile browsers may require tapping Play after a response.
- Feedback evaluates the transcript's wording/structure. It does not measure pronunciation, emotion, confidence or employability. No official score, certificate, learning completion or employer report is changed.

## Activation (not performed automatically)

1. Run the entire `supabase/migrations/033_voice_coach_usage.sql` in Supabase SQL Editor. RLS is already enabled in the file. It stores usage metadata only, never audio or conversation content. Applying it does not enable AI calls.
2. Create/use an OpenAI API project with billing and appropriate project usage controls. Configure an API key privately in server environment variables, never in chat or a `NEXT_PUBLIC_` variable. ChatGPT subscription access is separate from platform API configuration.
3. Copy the voice settings from `.env.example` into the server configuration. Keep `VOICE_COACH_ENABLED=false` until ready for a supervised student test. No real credentials are included or modified by this change.
4. Defaults: `gpt-4o-mini-transcribe`, `gpt-4.1-mini`, `gpt-4o-mini-tts` with `coral`. The models are server configurable; replacements must support these endpoints and structured output. Confirm availability in your project.
5. Set `VOICE_COACH_ENABLED=true`, restart the development server, and test with an eligible student. Authentication, active student status and `fn_has_learning_access` are checked on every request. Super Admin preview cannot spend student requests.
6. Default daily caps: 20 requests per student and 200 across the platform, resetting at midnight Asia/Kolkata. Listening to a question or asking for feedback uses one reservation. Feedback can involve transcription, text generation and speech generation; these are request-count caps, not rupee budgets. Adjust the two server variables as needed (maximum 100/student and 10,000/platform). Provider failures may count, preventing retry abuse. Do not enable for a wide release before reviewing API usage costs.
7. Use HTTPS for mobile microphone access. Plain LAN HTTP addresses generally cannot use the microphone; localhost is suitable on the development computer. Test Chrome/Android and Safari/iPhone on the actual hosted HTTPS origin.

## Privacy and security

Explicit student consent precedes AI actions. Microphone permission is requested only on Record answer. The microphone is stopped on finish, cancellation, unmount or page exit. A recording is uploaded only after Send answer. Recordings and responses are held in page memory, not localStorage or database. Clear practice releases the recording, transcript and playback. Responses use `store:false`, but this is not a claim of zero provider retention; the consent links to provider data handling. Review your institution's privacy requirements before rollout, including students below 18.

The server validates origin, authentication, role, active learning entitlement, input lengths and canonical mono PCM WAV duration before making provider calls. Body reading is bounded even without Content-Length. Usage reservations run through a service-role-only function with a transaction-level advisory lock to enforce per-user and global limits across servers. Browsers cannot reset counters or reserve against another user. Only the authenticated user's ID is passed by the server. API credentials never reach the browser; raw provider errors and student content are not logged. Do not add request/response body capture to production monitoring for this route.

## Verification

Automated tests use mocked AI responses and isolated PGlite, with no paid AI requests or hosted DB writes. They cover auth/role/entitlement, consent, input/audio bounds, server-derived identity, quota failure, privacy headers, partial speech failures, model response validation, RLS, limits and migration reruns.

Manual acceptance before release: Kannada-only, English-only and mixed answers; microphone denied; silence/noisy audio and inaccurate transcript correction; answer cancel before/after recording; navigation during recording; slow/offline network; audio autoplay blocked; quota exhausted; expired/suspended student; simultaneous requests; student/public/admin role restrictions. Ask Kannada-speaking reviewers to evaluate explanations and listen to the Indian English voice. Live voice quality and provider billing are unverified until credentials and a supervised test are available.

Official references checked during implementation:
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.openai.com/api/docs/guides/your-data
