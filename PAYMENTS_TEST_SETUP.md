# Razorpay test checkout and programme expiry

Implemented for test mode only. Live keys are deliberately rejected. No real payments have been taken or enabled.

## Database setup

In Supabase SQL Editor, run these complete files **once, in order**, after the existing 001–006 migrations:

1. `supabase/migrations/007_programme_access_enforcement.sql`
2. `supabase/migrations/008_razorpay_test_payments.sql`

Both files are transactional. If either reports an error, stop and share the error. Do not rerun earlier migrations. The coding agent tested these migrations in isolated PostgreSQL (PGlite), not against hosted Supabase. The application now needs both new migrations.

007 blocks unpaid/expired individual-student lesson content, safe assessment questions, lesson progress writes, assessment writes and progress recalculation. Course enrolment is still required. Active college students retain their college access. Existing result/skill/certificate history remains readable; expired accounts cannot fetch current question text. Previously loaded content and third-party video links cannot be recalled. Private video hosting/signed playback is a separate prerequisite if video URLs must also expire.

008 adds immutable payment identity, a TEST/LIVE distinction, service-only order reservation and atomic payment activation/refund functions. Test access cannot unlock a programme switched to LIVE. Do not switch to live operation during this test stage.

## Local configuration

Create a Razorpay account and select Test Mode in its dashboard. Generate test API keys and configure automatic payment capture. Keep keys out of chat, SQL, source control and screenshots.

Add these four entries to your existing **ignored** `.env.local`, filling values locally:

```dotenv
RAZORPAY_TEST_ENABLED=true
RAZORPAY_KEY_ID=your_rzp_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_webhook_secret
```

The key ID must start with `rzp_test_`. Do not prefix secrets with `NEXT_PUBLIC_`. Existing Supabase service-role configuration is required by server-only payment operations. Restart the development server after editing the environment file.

## Razorpay webhook

Use a reachable HTTPS staging URL ending in `/api/payments/razorpay/webhook`. `localhost:3002` cannot receive Razorpay webhook deliveries. Configure this URL in Razorpay **Test Mode**, using the same webhook secret as above, and subscribe to:

- `payment.captured`
- `order.paid`
- `refund.processed`

The endpoint verifies HMAC over the raw body, fetches the current payment from Razorpay using test credentials, checks the saved order/amount/currency, then applies the result in one database transaction. Provider or database failures return a retryable response. Repeated callbacks do not reset activation/expiry or duplicate enrolments. A delayed captured event cannot undo a full refund. Failed/authorized payments never grant access. A partial refund retains access; a completed full refund revokes it. Refunds are initiated in Razorpay; this app does not initiate money transfers.

The authenticated browser callback also verifies payment and can work during local checkout tests. Webhooks are required before release for closed-browser payments and refunds; do not treat a successful browser-only test as complete end-to-end verification.

## Try the checkout

1. Sign in as an individual student with a complete profile and no active programme purchase.
2. Open `/programme`. You should see **Test checkout — no real payment**.
3. Select **Review test checkout**. The server reserves the current offer and displays the agreed price and duration before opening Razorpay. Repeated attempts reuse a pending order and its original terms, which can differ from a subsequently changed public offer.
4. Complete a simulated payment using Razorpay's official test instructions. Do not enter real payment details for this test.
5. Confirm My Learning shows **Active**, **Test purchase**, the agreed amount, and an end date six calendar months after activation (or the duration saved for that purchase).
6. Confirm all currently active courses were enrolled and a lesson/assessment opens. Existing enrolment progress is preserved. Courses published after purchase are not automatically enrolled by this version.
7. Redeliver the event: purchase dates and enrolments must remain unchanged.
8. Make a full test refund and deliver its processed webhook: lesson/question reads and writes must stop while past results remain available.
9. Repeat with a college student: no purchase requirement should be introduced.

For synthetic expired/future/boundary cases, use the isolated database test rather than modifying real student purchases. Activated dates and agreed purchase terms are immutable.

## Local verification

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false
node tests/payments.cjs
node tests/programme-access.cjs
node tests/individual-programme.cjs
node tests/login-portals.cjs
node tests/skills-dashboard.cjs
node tests/payment-database.cjs <absolute-path-to-installed-@electric-sql/pglite>
```

PGlite is a test-only runtime installed outside the application; it is not a production dependency. The database test uses all eight migrations with mocked Supabase auth roles/functions and real PostgreSQL RLS. The only extension substitution is `uuid_generate_v4()` using core `gen_random_uuid()` in place of unavailable extension packages. No hosted data is used.

## Remaining before live launch

Merchant approval, real provider configuration, hosted migration application, publicly reachable webhook delivery and end-to-end test evidence remain required. Live-mode enablement is intentionally a separate change. Confirm refund policy and programme catalogue before launch. Account-sharing/session restrictions and protected video delivery are not implemented by this change. No Super Admin account has been created or promoted.

Official references: [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [webhook verification/testing](https://razorpay.com/docs/webhooks/validate-test/).
