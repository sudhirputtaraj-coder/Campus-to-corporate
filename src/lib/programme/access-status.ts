export type ProgrammePurchase = {
  payment_mode?: string;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  price_paise: number;
  currency: string;
  access_months: number;
};

export type ProgrammeAccessStatus = {
  state: 'not-activated' | 'active' | 'expired' | 'pending' | 'failed' | 'refunded' | 'scheduled' | 'unavailable';
  purchase?: ProgrammePurchase;
};

// Presentation only. This is not a substitute for database/content authorization.
export function describeProgrammeAccess(
  purchases: ProgrammePurchase[], now = Date.now(),
): ProgrammeAccessStatus {
  const paid = purchases.filter(p => p.status === 'PAID');
  const validDates = (p: ProgrammePurchase) => p.activated_at !== null && p.expires_at !== null
    && Number.isFinite(Date.parse(p.activated_at)) && Number.isFinite(Date.parse(p.expires_at))
    && Date.parse(p.expires_at) > Date.parse(p.activated_at);
  const active = paid.filter(p => validDates(p) && Date.parse(p.activated_at!) <= now && now < Date.parse(p.expires_at!))
    .sort((a, b) => Date.parse(b.expires_at!) - Date.parse(a.expires_at!))[0];
  if (active) return { state: 'active', purchase: active };
  const latest = [...purchases].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!latest) return { state: 'not-activated' };
  if (latest.status === 'PAID') {
    if (!validDates(latest)) return { state: 'unavailable' };
    return { state: Date.parse(latest.activated_at!) > now ? 'scheduled' : 'expired', purchase: latest };
  }
  const state = { PENDING: 'pending', FAILED: 'failed', REFUNDED: 'refunded' } as const;
  const value = state[latest.status as keyof typeof state];
  return value ? { state: value, purchase: latest } : { state: 'unavailable' };
}
