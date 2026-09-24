# Free individual programme access

Apply the whole supabase/migrations/026_free_programme_access.sql file in Supabase SQL Editor after previous migrations. It changes the current offer to zero; the existing duration remains unchanged (normally six months). Do not reapply this migration to change pricing later.

Super Admin > Individual Programme Settings: set One-time price to 0 for free enrolment, or a positive amount for future paid enrolments. Existing free grants and purchases keep their agreed dates. Paid checkout still requires payment setup.

Individual students complete their profile, open /programme, and click Activate free programme access. Activation enrols them in currently active courses, preserves existing enrolments, and starts the configured access period. Repeated activation never extends expiry. Each student receives one free period; automatic free renewal is not provided. Expired students cannot unlock lessons or submit assessment work. College access is unchanged.

The separate free-access table uses RLS and has no student write grants; activation is an authenticated RPC restricted to active individual students. Free access is independent of Razorpay test/live mode. Existing paid purchases are untouched.

Validation: isolated database tests cover activation, enrolment, expiry, repeat activation, unauthorised changes and later paid pricing; programme settings tests and TypeScript also checked. Hosted application testing requires applying migration 026.
