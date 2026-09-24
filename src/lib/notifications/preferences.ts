export const WHATSAPP_CONSENT_VERSION = 'progress-updates-v1';
export function parseWhatsAppPreferences(form: FormData) {
  const enabled = form.get('enabled') === 'on';
  if (!enabled) return { values: { p_phone: null, p_enabled: false, p_learning: false, p_scores: false, p_employability: false } };
  const raw = form.get('phone');
  const phone = typeof raw === 'string' ? raw.trim().replace(/[\s()-]/g, '') : '';
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return { error: 'Enter your WhatsApp number with its country code, for example +91 followed by your 10-digit number.' };
  const learning = form.get('learning') === 'on';
  const scores = form.get('scores') === 'on';
  const employability = form.get('employability') === 'on';
  if (!learning && !scores && !employability) return { error: 'Choose at least one type of update.' };
  return { values: { p_phone: phone, p_enabled: true, p_learning: learning, p_scores: scores, p_employability: employability } };
}
