import Link from 'next/link';
import type { DirectoryAccess } from '@/lib/college/student-directory';

export async function CollegeProgrammeSkills({ access, colleges, selectedCollege }: { access: DirectoryAccess; colleges: { id: string; name?: string }[]; selectedCollege?: string }) {
  const scoped = colleges.filter(c => (!selectedCollege || c.id === selectedCollege) && (access.collegeIds === null || access.collegeIds.includes(c.id)));
  const groups = await Promise.all(scoped.map(async college => {
    const setting = await access.client.from('college_programmes').select('college_id').eq('college_id', college.id).maybeSingle();
    const skills: { id: string; name: string; display_order: number }[] = [];
    let error = !!setting.error;
    if (setting.data) for (let from = 0; ; from += 500) {
      const result = await access.client.from('college_programme_skills').select('skill_id,skill:skills(id,name,status,display_order)').eq('college_id', college.id).order('skill_id').range(from, from + 499);
      if (result.error) { error = true; break; }
      for (const row of result.data) {
        const skill = (Array.isArray(row.skill) ? row.skill[0] : row.skill) as { id: string; name: string; status: string; display_order: number } | null;
        if (skill?.status === 'ACTIVE') skills.push(skill);
      }
      if (result.data.length < 500) break;
    }
    return { college, configured: !!setting.data, error, skills: skills.sort((a,b) => a.display_order - b.display_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) };
  }));
  return <section className="my-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Skills covered in your programme</h2>
    <p className="mt-2 text-sm text-slate-600">Published skills selected in Programs. Students access the published modules, lessons and assessments under these skills. Department and date filters do not change this college-wide selection.</p>
    {!groups.length && <p className="mt-4">No active authorised college is selected.</p>}
    {groups.map(group => <div key={group.college.id} className="mt-5 border-t pt-4"><h3 className="font-semibold">{group.college.name}</h3>
      {group.error ? <p role="alert">Skills could not be loaded. Please refresh and try again.</p> : !group.configured ? <p className="mt-2">Programme skills have not been selected yet. Open Programs, choose the skills and save. Existing student access is unchanged.</p> : <><p className="mt-2 text-sm">{group.skills.length} published skills selected</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{group.skills.map(skill => <li key={skill.id} className="rounded-lg border p-3">{skill.name}</li>)}</ul>{!group.skills.length && <p>No published skills in this selection. Review Programs or contact Super Admin.</p>}</>}
      <Link className="mt-3 inline-block underline" href={'/college/programs?college_id=' + group.college.id}>Manage programme skills</Link>
    </div>)}
  </section>;
}
