export function parseSkillMappings(input: unknown): { mappings: { skill_id: string; weight: number }[]; error?: never } | { error: string; mappings?: never } {
  if (!Array.isArray(input) || input.length > 100) return { error: 'Choose up to 100 skills.' };
  const seen = new Set<string>();
  let total = 0;
  const mappings = [];
  for (const item of input) {
    if (!item || typeof item.skillId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.skillId)
      || seen.has(item.skillId.toLowerCase()) || typeof item.percent !== 'string' || !/^\d{1,3}(\.\d{1,2})?$/.test(item.percent)) return { error: 'Choose each skill once and enter valid percentages.' };
    const units = Math.round(Number(item.percent) * 100);
    if (units <= 0 || units > 10000) return { error: 'Each percentage must be greater than 0 and no more than 100.' };
    total += units; seen.add(item.skillId.toLowerCase());
    mappings.push({ skill_id: item.skillId, weight: units / 10000 });
  }
  if (mappings.length && total !== 10000) return { error: 'Skill percentages must total 100%.' };
  return { mappings };
}
