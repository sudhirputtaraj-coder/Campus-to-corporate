export const LOGIN_PORTALS = [
  { id: 'individual', title: 'Individual student', description: 'Learning independently, from any college.', role: 'STUDENT' },
  { id: 'college-student', title: 'College student', description: 'Learning through your participating college.', role: 'STUDENT' },
  { id: 'college-admin', title: 'College administrator', description: 'Manage your college and its students.', role: 'COLLEGE_ADMIN' },
  { id: 'employer', title: 'Employer', description: 'Post jobs and compare college readiness.', role: 'EMPLOYER' },
  { id: 'trainer', title: 'Trainer', description: 'Access your assigned batches.', role: 'TRAINER' },
  { id: 'super-admin', title: 'Super Admin', description: 'Manage the platform and programme pricing.', role: 'SUPER_ADMIN' },
] as const;

export type LoginPortal = typeof LOGIN_PORTALS[number]['id'];

/** Portal choice is a UI preference, never a source of account permissions. */
export function resolveLoginPortal(
  portal: string,
  profile: { role: string; status: string } | null,
  student: { account_type: string; status: string } | null,
): { destination: string } | { error: string } {
  const choice = LOGIN_PORTALS.find(item => item.id === portal);
  if (!choice || !choice.role) return { error: 'This sign-in option is not available yet.' };
  if (!profile || profile.status !== 'ACTIVE') return { error: 'Your account is not active or its profile is unavailable. Please contact your administrator.' };
  if (profile.role !== choice.role) return { error: 'This account uses a different sign-in option. Please select the option provided for your account.' };
  if (profile.role === 'SUPER_ADMIN') return { destination: '/admin/dashboard' };
  if (profile.role === 'COLLEGE_ADMIN') return { destination: '/college/dashboard' };
  if (profile.role === 'EMPLOYER') return { destination: '/employer/dashboard' };
  if (profile.role === 'TRAINER') return { destination: '/trainer/dashboard' };
  if (!student) return { destination: '/student/setup' };
  if (student.status !== 'ACTIVE') return { error: 'Your student account is not active. Please contact your administrator.' };
  const expectedType = portal === 'individual' ? 'INDIVIDUAL' : 'COLLEGE';
  if (student.account_type !== expectedType) return { error: `Please choose ${student.account_type === 'COLLEGE' ? 'College student' : 'Individual student'} to sign in to this account.` };
  return { destination: '/student/dashboard' };
}
