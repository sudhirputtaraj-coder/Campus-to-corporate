'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collegeDirectoryAccess } from './student-directory';

export async function saveCollegeProgramme(collegeId: string, allSkills: boolean, skillIds: string[]) {
  const input = z.object({ collegeId: z.string().uuid(), allSkills: z.boolean(), skillIds: z.array(z.string().uuid()).max(500) }).safeParse({ collegeId, allSkills, skillIds });
  if (!input.success || (!allSkills && !skillIds.length)) return { error: 'Select all skills or choose at least one skill.' };
  try {
    const access = await collegeDirectoryAccess();
    if (!access || (access.collegeIds !== null && !access.collegeIds.includes(collegeId))) return { error: 'Active administrator access to this college is required.' };
    const { data, error } = await access.client.rpc('fn_set_college_programme', { p_college: collegeId, p_all_skills: allSkills, p_skills: allSkills ? [] : [...new Set(skillIds)] });
    if (error) return { error: error.code === 'P0001' ? error.message : 'Programme access could not be saved. Ask the platform administrator to check migration 041.' };
    revalidatePath('/college', 'layout'); revalidatePath('/student', 'layout');
    return { success: true, skills: Number(data?.skills || 0) };
  } catch { return { error: 'Could not save programme access. Refresh and try again.' }; }
}
