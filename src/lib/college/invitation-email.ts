import 'server-only';
import { deliverGmailInvitation } from './invitation-gmail';
export function invitationEmailConfig() {
  const key = process.env.RESEND_API_KEY, from = process.env.INVITATION_FROM_EMAIL;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.hostname.includes('.') || /(^|\.)(localhost|local|test|example|invalid)$/.test(url.hostname) || /^[\d.:\[\]]+$/.test(url.hostname)) return null;
    const name = (process.env.INVITATION_SENDER_NAME || 'Campus to Corporate').trim();
    if (!name || name.length > 200 || /[\r\n]/.test(name)) return null;
    const provider = process.env.INVITATION_EMAIL_PROVIDER || (process.env.GMAIL_USER ? 'gmail' : 'resend');
    if (provider === 'gmail') {
      const user = (process.env.GMAIL_USER || '').trim().toLowerCase();
      const password = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
      if (!/^[a-z0-9.]+@(gmail|googlemail)\.com$/.test(user) || !/^[a-z]{16}$/i.test(password)) return null;
      return { provider: 'gmail' as const, user, password, name, joinUrl: `${url.origin}/join` };
    }
    if (provider !== 'resend' || !key || !from || /[\r\n]/.test(from) || !from.includes('@')) return null;
    return { provider: 'resend' as const, key, from, name, joinUrl: `${url.origin}/join` };
  } catch { return null; }
}
export type MailOutcome = { status: 'SENT' | 'FAILED' | 'UNCERTAIN'; detail: string; provider_id?: string };
export async function deliverInvitation(config: NonNullable<ReturnType<typeof invitationEmailConfig>>, job: { id: string; email: string; college: string; attempt: number }, request: typeof fetch = fetch): Promise<MailOutcome> {
  const name = config.name || 'Campus to Corporate';
  const message = {
    subject: `Your college invitation to ${name}`,
    text: `${job.college} has invited you to ${name}.\n\nOpen ${config.joinUrl}\n\nUse ${job.email}. If you are new, create an account, choose your own password and verify your email. If you already have an account, sign in. Then accept the invitation shown for ${job.college}.\n\nYour password is private; your college does not create or receive it. Contact your college administrator if you were not expecting this invitation.`,
  };
  if (config.provider === 'gmail') return deliverGmailInvitation(config, job, message);
  try {
    const response = await request('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `college-invite/${job.id}/${job.attempt}` },
      body: JSON.stringify({ from: config.from, to: [job.email], ...message }),
    });
    if (response.ok) {
      const body = await response.json();
      if (typeof body.id === 'string' && body.id) return { status: 'SENT', provider_id: body.id, detail: 'Accepted by email provider. Inbox delivery is not confirmed.' };
    } else if ([400,401,403,404,422,429].includes(response.status)) {
      return { status: 'FAILED', detail: `Email provider rejected this request (${response.status}). Check sender settings or sending limits, then retry.` };
    }
    return { status: 'UNCERTAIN', detail: 'Delivery result is unknown. Check the email provider before manually sharing the join link; automatic resend is disabled.' };
  } catch {
    return { status: 'UNCERTAIN', detail: 'The connection ended before delivery was confirmed. Check the email provider; automatic resend is disabled.' };
  }
}
