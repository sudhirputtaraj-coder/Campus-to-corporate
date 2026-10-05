import 'server-only';
import { createTransport } from 'nodemailer';
import type { MailOutcome } from './invitation-email';

export async function deliverGmailInvitation(
  config: { user: string; password: string; name: string },
  job: { id: string; email: string },
  message: { subject: string; text: string },
): Promise<MailOutcome> {
  const transport = createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    dnsTimeout: 10000, disableFileAccess: true, disableUrlAccess: true,
    logger: false, debug: false,
  });
  try {
    const info = await transport.sendMail({
      from: { name: config.name, address: config.user },
      to: [{ address: job.email, name: '' }],
      envelope: { from: config.user, to: [job.email] },
      // Correlation only. SMTP does not promise idempotency; unknown sends stay blocked.
      messageId: `<college-invite-${job.id}@gmail.com>`,
      ...message,
    });
    if (info.accepted?.some(address => typeof address === 'string' && address.toLowerCase() === job.email.toLowerCase())) {
      return { status: 'SENT', provider_id: info.messageId, detail: 'Accepted by Gmail. Inbox delivery is not confirmed.' };
    }
    return { status: 'UNCERTAIN', detail: 'Gmail acceptance could not be confirmed. Check the Gmail Sent folder and delivery notices before sharing the join link manually.' };
  } catch (error) {
    const smtp = error as { responseCode?: number; code?: string } | null;
    if ((smtp?.responseCode && smtp.responseCode >= 400 && smtp.responseCode < 600) || ['EAUTH','EENVELOPE'].includes(smtp?.code || '')) {
      return { status: 'FAILED', detail: 'Gmail rejected the email. Check the App Password, account access and sending limit before retrying.' };
    }
    return { status: 'UNCERTAIN', detail: 'The Gmail connection ended without confirmation. Check the Sent folder and delivery notices. Automatic resend is disabled to avoid duplicates.' };
  } finally { transport.close(); }
}
