# Send student invitations from Gmail

No additional database migration is needed after migration 040.

1. Choose the platform name and create its Gmail account yourself. Complete Google's account verification and recovery setup.
2. Enable [2-Step Verification](https://support.google.com/accounts/answer/185839) and generate a [Google App Password](https://support.google.com/accounts/answer/185833) for the platform. App Passwords may be unavailable for some account security settings or managed accounts. Do not disable security protections to work around that.
3. Store the following in the server's environment settings (or `.env.local` for development). Do not put the password in chat, source control, browser code, or any `NEXT_PUBLIC_` variable:

```dotenv
INVITATION_EMAIL_PROVIDER=gmail
INVITATION_SENDER_NAME="Your Platform Name"
GMAIL_USER=yourplatform@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
NEXT_PUBLIC_APP_URL=https://your-public-platform-address
```

The App Password is a Google-generated 16-character code; spaces can be included or removed. It is not the normal Gmail sign-in password. The sender address always matches the authenticated Gmail account. The name controls the display name and platform name in the invitation email. The Gmail password must be replaced if Google revokes it, such as after an account password change.

4. Restart or redeploy the app. Keep Supabase's Auth Site URL and callback allowlist configured for the public address. A sender domain is not required for this Gmail option; students still need a public HTTPS website address to open the join link.
5. Invite one mailbox you control first and verify receipt, signup/sign-in, email verification, invitation acceptance and learning access. Then send the college roster from **College → Students & Access**. Each student receives a separate email; recipients cannot see the rest of the list.

Gmail may stop sending when its daily limits are reached. Google documents a limit error above 500 emails per day for personal Gmail; this is not a guaranteed allowance or delivery rate. Other emails from the account count too. A new account can encounter security restrictions. See [Google's sending limits](https://support.google.com/mail/answer/22839). Begin with a small supervised batch. The platform's 500-row import limit and 1,000-per-college queue limit do not override Gmail's account limits, which apply across colleges using the same sender.

On a clear SMTP rejection, the platform pauses and allows a retry after the problem is resolved. An unknown result or timeout is not automatically resent: SMTP has no idempotency guarantee. Check Gmail's Sent folder and delivery notices before manually sharing the join link. Gmail acceptance is not confirmation that the recipient received the message.

This configures college invitation emails only. Supabase signup verification and password reset emails still use Supabase Auth's separate email configuration. Resend remains an optional alternative; the Gmail path needs no Resend subscription or key.
