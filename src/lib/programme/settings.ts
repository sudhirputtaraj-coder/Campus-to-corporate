export function parseProgrammeSettings(price: unknown, months: unknown) {
  if (typeof price !== 'string' || !/^\d+(\.\d{1,2})?$/.test(price.trim())) return null;
  if (typeof months !== 'string' || !/^\d+$/.test(months.trim())) return null;
  const [rupees, paise = ''] = price.trim().split('.');
  const pricePaise = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  const accessMonths = Number(months);
  if (!Number.isSafeInteger(pricePaise) || pricePaise < 0 || pricePaise > 100000000 || accessMonths < 1 || accessMonths > 120) return null;
  return { price_paise: pricePaise, access_months: accessMonths };
}

export function formatINR(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
}
