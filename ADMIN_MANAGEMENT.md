# College and user directories

Open Manage Colleges or Manage Users from the Super Admin dashboard.
Both pages require an active Super Admin session and use the existing database
permissions. No new SQL migration is required for these pages.

- Colleges: add a college; edit name, unique code, location, contact details and status.
  Codes use letters, numbers, hyphens and underscores and are saved in uppercase.
- Users: search registered profiles by name or full email, view role and status,
  edit name and phone, and activate, suspend or deactivate ordinary accounts.
  Super Admin records cannot be edited through this directory.
- Open a row to edit. Search results are paginated in groups of 25.
- Failed saves preserve entered values. Duplicate college codes show a useful error.

These directories do not create login credentials, send invitations or delete
historical records. The Set up college access link opens the separate onboarding
workflow documented in COLLEGE_ACCOUNT_SETUP.md; migration 013 is required for it.
College status is an administrative record; it is not a blanket switch that
revokes every associated student's existing learning entitlement.
Account status is checked at portal sign-in and by existing access checks;
changing it does not itself revoke Supabase sessions already issued.

Validation: TypeScript, tests/admin-management.cjs, and isolated database checks.
Manual acceptance: sign in as Super Admin, add a test college, edit it, search by
name, confirm duplicate-code feedback, then edit a test user's name/status and
verify a suspended account cannot sign in. Do not suspend a real user for testing.
