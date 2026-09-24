# Mobile access and WhatsApp preparation

## Mobile web

The shared layout now supplies an expandable mobile Menu on public, student, college and administrator pages. Menu links change with the current route; existing middleware and database permissions still control actual access. The menu closes on navigation. Phones use stacked links, touch-sized buttons and 16px form fields. Wide analytics tables scroll within their panels. No native app or employer portal has been added; the existing employer option remains coming soon.

Checks: TypeScript passed. The sign-in page was visually inspected at 360px using the running local site, and its mobile menu expanded correctly. The programme page initially returned 404 during development compilation, then loaded successfully on refresh at 390px. The account-type cards were also compacted and inspected at 360px. Authenticated student/college/admin flows and physical iOS/Android devices still need a walkthrough after database setup. These changes are not a claim of full device certification.

For a phone on the same trusted Wi-Fi network, use the Network address printed by the development server, with the actual port. localhost on a phone refers to that phone. Public access requires deployment to the final HTTPS domain and matching authentication redirects; no deployment or network/firewall configuration is changed here.

## WhatsApp preferences only

Run all of `supabase/migrations/022_whatsapp_preferences.sql` in the Supabase SQL Editor. It creates a private table and an authenticated self-service save function. It does not depend on the missing Phase 3 migration files. It can be rerun without losing preferences.

Both active individual and college students can open **Dashboard → WhatsApp progress updates**, or use **Menu → WhatsApp updates** on a phone. Preferences include international number, explicit consent and weekly learning/assessment/employability update selections. No subscription is enabled by default. Turning it off clears the saved phone and selected update flags. RLS prevents students from reading another student's number; direct browser writes are denied and the RPC takes its identity from the session. No administrator subscription on behalf of students is supported.

There is deliberately no sender, message queue, verification code, delivery scheduler or provider secret in this change. Saved consent is a preference, not proof of number ownership or delivery activation. The page explicitly says that verification and delivery are unavailable. The user selected preparation only because no WhatsApp Business provider account exists yet.

## Before actual delivery

1. Choose and configure the WhatsApp Business provider, business sender and server-side credentials.
2. Implement and test number ownership verification, expiry, throttling and reset on number change. Never send scores to an unverified number.
3. Approve weekly summary templates for the selected content, document the provider in the privacy notice, and implement opt-out both in the app and from WhatsApp. Meta requires opt-in and approved templates for business-initiated conversations: https://business.whatsapp.com/policy
4. Implement a server-only scheduled dispatcher with per-user/per-week deduplication, consent/verification/active-account checks immediately before sending, bounded retries and signed delivery/opt-out webhooks.
5. Reconcile the missing employability database schema before reading those scores. Missing results must say not yet assessed, not 0. Messages must link to the HTTPS platform and must not expose login tokens or answer keys.
6. Test with designated verified recipients before enabling real messages. Student preferences alone must never activate delivery.

Validation: `tests/whatsapp-preferences.cjs` covers input normalization, missing country code, opt-out and ignored identity fields. `tests/whatsapp-database.cjs` uses isolated PostgreSQL and checks self-only access, both student types, anonymous/admin/suspended rejection, consent recording and reruns. It takes the PGlite package path as its first argument, as the existing database test does.
