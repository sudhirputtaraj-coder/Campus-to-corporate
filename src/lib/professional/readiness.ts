export interface CollegeReadiness {
  id: string;
  name: string;
  code: string;
  active_students: number;
  measured_students: number;
  qualifying_students: number;
  latest_measurement: string | null;
}

/** Denominator is all active college students, including those awaiting final evidence. */
export function readinessPercentage(qualifying: number, active: number): string | null {
  if (active === 0) return null;
  return (qualifying / active * 100).toFixed(2);
}
