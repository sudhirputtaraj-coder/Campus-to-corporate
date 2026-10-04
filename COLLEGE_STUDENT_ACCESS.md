# College student onboarding and access

## Enable once

1. Migration 035 must already be applied. In Supabase SQL Editor run the **entire** `supabase/migrations/036_college_student_access.sql` file. It is transactional and safe to rerun. No existing students or learning records are deleted.
2. Refresh the app and sign in as a college administrator. Open **Students & Access** in the college navigation or **Add students & manage access** on the dashboard/student report.
3. Use the existing verified-email configuration. For a pilot, enable email confirmation, configure working Auth email delivery, and allow the app's `/auth/callback` URL in Supabase Authentication URL Configuration. New verification links carry `next=/join`. `NEXT_PUBLIC_APP_URL` must be the real HTTPS app origin in production. Local students can only open localhost links on the same machine; share your deployed app URL for the pilot.

## Administrator: one screen

- Select your college if you manage more than one.
- Enter student name, **email**, and **register number**. Optionally select an active department and matching batch. Create departments/batches through the linked pages if needed.
- Click **Add student & prepare access**. The student appears as **Waiting to join**.
- Click **Copy joining instructions** and share them with that student through your usual channel. The app does not send invitation emails or create temporary passwords. The student receives a verification email when they create their account.
- Search by name, email, or register number. Filter waiting, active, and removed students. Results are paginated.
- For incorrect pending details, **Cancel invitation**, then add the corrected details. Invitations stay pending until accepted or cancelled; the shared `/join` link is generic and only a verified matching email can claim access.
- After joining, open the student's profile for progress and department/batch changes. Active courses already assigned to the college are enrolled on joining. Assign additional college courses through the existing platform workflow; use **Courses & Enrolment** to manage batch enrolments.
- **Remove access** asks for confirmation and sets the student inactive. It blocks learning/assessment access even in an existing session. It preserves the Auth login, profile, enrolments, progress, results, and certificates. **Restore access** restores the college student status. It cannot override a platform account suspension or a suspended student record.

## Student

1. Open the shared `/join` link, or choose **College student → Create your login & join your college** on the sign-in page.
2. Use the exact email your administrator added. Create a password of at least 8 characters. Existing users choose **I already have an account**.
3. Verify the email using the inbox link (check spam). The confirmation returns to `/join`; sign in there if needed. **Resend verification email** and **Forgot password?** are available.
4. Check college, register number, department and batch, then click **Join [college]**. Your dashboard opens.
5. On future visits choose **College student** and sign in with your **email and chosen password**. The register number is not a login ID.

If no invitation appears, the administrator should check the exact email in Students & Access. Staff accounts and existing college affiliations cannot be converted by a student invitation. An unused individual profile can join; individual accounts with purchases, free access, enrolments, or assessment history require a platform administrator's transfer review.

## Verification

Automated tests use an isolated PostgreSQL database, never hosted Supabase. They cover role and college scope, verified Auth email, spoofing, cancellation, duplicate/replayed claims, atomic rollback, placement, course enrolment, history retention, removal/restoration, pagination and audit events. Server-action tests cover validation, confirmation, authentication callbacks, and safe delegation of identity to the database.

Before sharing with a pilot cohort, apply 036 and complete one real test-student cycle: add → share link → signup/verify → join → open course → remove → check access blocked → restore → check progress preserved. Auth email delivery and authenticated browser testing against your hosted project require this final smoke test; applying SQL alone does not test delivery.
