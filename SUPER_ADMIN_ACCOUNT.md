# Super Admin account

An administrator's role belongs to their user ID, not a hardcoded email address.
Register and confirm the chosen account first. A trusted operator must then assign
SUPER_ADMIN to that exact verified account in profiles. Selecting the Super Admin
login option never grants administrator rights. Public registration remains STUDENT.

## Changing the email later

From the Super Admin dashboard, open Account Settings. Enter a new email and the
current password. Follow the confirmation links from Supabase, then sign in using
the confirmed address. The user ID and role are preserved. This changes the email
of the same account; it does not promote a separate existing account.

Keep Supabase Auth email confirmations and Secure email change enabled (the latter
confirms both the existing and new inbox). Set Supabase's Site URL to the working
site, currently http://localhost:3002 for local testing, and use the production HTTPS
URL before launch. The action relies on Supabase's configured confirmation redirect.

Apply migration 012_sync_confirmed_account_email.sql in Supabase SQL Editor. It
keeps profiles.email in sync when Auth commits a confirmed email change. It never
changes roles. No keys, passwords or specific administrator email are stored here.

## Verification

Run node tests/admin-account.cjs and the isolated payment-database.cjs suite.
After configuring email delivery, test the two-inbox confirmation flow with a test
administrator. Verify the old email remains current before confirmation, the new
email works after confirmation, and the same account retains SUPER_ADMIN.
Live email delivery and confirmation require a registered administrator and have
not been tested by the automated suite.
