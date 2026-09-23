# Account email return links

Signup, password reset and administrator email change now explicitly request an
/auth/callback URL. The callback exchanges the Supabase PKCE code for a session,
then goes to a fixed allowlist of local paths. Invalid/expired links use /auth/error.
Use the latest email in the same browser that initiated the request (PKCE verifier).

Local testing: set Supabase Authentication → URL Configuration Site URL to
http://localhost:3002. Add http://localhost:3002/auth/callback** to Redirect URLs
to cover the callback's next query parameter. If using another local port, add
its exact localhost origin/path too. The development app uses the current loopback
Origin header, preserving the active port, instead of a stale localhost:3000 URL.

Production: configure NEXT_PUBLIC_APP_URL to the final HTTPS origin and add that
origin's /auth/callback** to Supabase Redirect URLs. Do not use an unrestricted
production wildcard. Keep default email templates using {{ .ConfirmationURL }};
a custom hardcoded SiteURL template will ignore requested callbacks. Keep email
confirmation and Secure email change enabled. Restart the app after env changes.

No database migration is needed. Existing passwords and account roles are unchanged.
No emails are sent by the automated tests. Test signup, recovery and email change
with test inboxes after URL configuration. Provider email delivery and allowlist
configuration must be checked in the connected Supabase project.

Reference: https://supabase.com/docs/guides/auth/redirect-urls
