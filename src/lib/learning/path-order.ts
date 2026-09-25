export interface PathSkill { id: string; code: string; name: string; display_order?: number; }
export interface PathLesson { id: string; module_id: string; title: string; sequence: number; status: string; }
export interface PathModule { id: string; skill_id: string | null; course_id: string; title: string; sequence: number; status: string; }
const foundation = ['PROF', 'COMM', 'CRT', 'PROB', 'TEAM', 'TIME', 'ADAPT'];
export function skillRank(skill: PathSkill) {
  if (skill.display_order != null) return skill.display_order;
  const index = foundation.indexOf(skill.code);
  return index >= 0 ? (index + 1) * 10 : skill.name.toLowerCase() === 'ai knowledge' ? 80 : 999;
}
export function orderSkills<T extends PathSkill>(skills: T[]): T[] {
  return [...skills].sort((a,b) => skillRank(a)-skillRank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export function orderedLessons(modules: PathModule[], lessons: PathLesson[], skills: PathSkill[]) {
  const ranks = new Map(orderSkills(skills).map((s,i) => [s.id,i]));
  const mods = [...modules].filter(m=>m.status==='ACTIVE').sort((a,b)=>(ranks.get(a.skill_id||'')??999)-(ranks.get(b.skill_id||'')??999)||a.sequence-b.sequence||a.id.localeCompare(b.id));
  const result = mods.flatMap(m=>lessons.filter(l=>l.module_id===m.id&&l.status==='ACTIVE').sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id)).map(l=>({...l,course_id:m.course_id,module_title:m.title,skill_id:m.skill_id})));
  // An introductory lesson remains the first step without moving or recreating its record.
  return [...result.filter(l=>/^Start here:/i.test(l.title)),...result.filter(l=>!/^Start here:/i.test(l.title))];
}
export function nextUnfinished<T extends {id:string}>(lessons:T[], completed:Set<string>) { return lessons.find(l=>!completed.has(l.id)); }
export function cleanModuleTitle(title:string) { return title.replace(/^\d+(?:\.\d+)*[:.]?\s+/, ''); }
