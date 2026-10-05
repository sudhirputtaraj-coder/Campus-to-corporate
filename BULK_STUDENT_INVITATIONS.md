# Bulk college student invitations

Open **College → Students & Access → Invite students in bulk**.

1. Upload `.xlsx` (first worksheet), `.docx` (one table or email list), `.csv` or `.txt`, or paste email addresses. Maximum 500 students and 2 MB per file; expanded Office documents are limited to 20 MB.
2. Recommended columns: `email`, `full_name`, `register_number`. The downloadable CSV template opens in Excel. Store register numbers as **Text**, especially those with leading zeros. Replace spreadsheet formulas with their values. Older `.xls`/`.doc` files must be saved as `.xlsx`/`.docx`.
3. Review and edit every row. For email-only lists, names default to the email's local part and stable temporary `EMAIL-...` register numbers are generated. These are real stored register numbers; replace them with official numbers before inviting if available.
4. Optionally select one department and batch for the entire list. Use separate imports for different groups.
5. Click **Invite students by email**. Keep the page open while sending. Use **Pause sending** or return later and **Send waiting invitations** to resume. Saved queue status survives refreshes.

Students open the public `/join` link, create an account using the exact invited email (or sign in to an existing account), verify their email, and accept their college invitation. No password is generated or sent by the college. Existing account-transfer restrictions and learning history protections still apply.

## Platform setup

- Apply `supabase/migrations/040_bulk_student_invitations.sql` after migration 039 in Supabase SQL Editor.
- For Gmail, follow `GMAIL_INVITATIONS_SETUP.md`. Use `INVITATION_EMAIL_PROVIDER=gmail`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `INVITATION_SENDER_NAME`.
- Alternatively set `INVITATION_EMAIL_PROVIDER=resend`, server-only `RESEND_API_KEY` and `INVITATION_FROM_EMAIL` to a verified Resend sender.
- Set `NEXT_PUBLIC_APP_URL` to the deployed public HTTPS origin, for example `https://learn.your-domain.in`. Localhost links cannot be emailed. Configure Supabase Auth Site URL and allowed callback URLs for that deployment too.
- Keep `SUPABASE_SERVICE_ROLE_KEY` on the server. Restart/redeploy after changing environment variables.
- Check the sender account's sending allowance for 200–300 invitations, plus separate Supabase Auth email capacity for signup verification. Gmail has daily limits and may restrict sending. This feature does not configure Supabase SMTP.
- Perform a live acceptance test using a college-controlled mailbox: invite, receive, sign up/verify, accept, reach assigned learning, then check an existing student account. Automated tests mock email delivery; they do not send messages.

## Results and recovery

Duplicate emails/register numbers within a preview must be corrected. Existing pending invitations or students in the college are not overwritten. Each import reports row-level results; a rejected row creates neither an invitation nor a mail job. For a pre-existing manual invitation, use the existing Share join link control, or cancel it and reimport after verifying the address.

The queue claims each message atomically. Provider acceptance is labelled separately from inbox delivery. Explicit provider rejections may be retried (at most five attempts); inspect the sender configuration/quota first. A network timeout, ambiguous provider error, or interrupted save is **not automatically resent**. Check the Gmail Sent folder and delivery notices, or Resend's logs, for that recipient, then share the join link manually if necessary. A process terminated mid-send can remain `SENDING`; treat it as an unknown result. Sent messages cannot be claimed again. Cancellation prevents unclaimed mail from being sent; an already in-flight email cannot be recalled, but its cancelled invitation cannot be accepted.

There is no background worker: closing the page stops future sends, while a request already in flight may finish. Up to 500 outstanding jobs appear at once; refresh after finishing a page to load more. A college can queue at most 1,000 bulk invitations in a rolling 24 hours. Outstanding uncertain jobs require administrator review; do not blindly reset their database status. Provider bounces/delivery receipts are checked in Gmail or Resend; no webhook inbox-delivery tracking is implemented.

Files are parsed in memory and not stored. College membership is checked on every server action and database import. Authenticated browser clients can read only authorized college queues and cannot claim messages or forge delivery status.
