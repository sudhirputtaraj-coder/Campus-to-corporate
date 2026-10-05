import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { LearningPath } from '@/components/learning-path';
import ProgrammeStatus from '../programme-status';

export default async function StudentLearningPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('user_id', user.id)
    .single();

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, account_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (studentError) throw new Error('Unable to load your student profile. Please try again.');
  if (!student) {
    redirect('/student/setup');
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Student</span>
            </Link>

          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 hidden sm:inline">{profile?.full_name}</span>
            <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
              <Home className="w-4 h-4" />
            </Link>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Learning Path</h1>
        <p className="mb-6 text-slate-600">Choose a skill, open a module, then work through its lessons and practice.</p>
        <LearningPath studentId={student.id} selectedSkill={skill} />
        {student.account_type === 'INDIVIDUAL' && <details className="mt-6 rounded-xl border p-4"><summary>Programme access and expiry</summary><ProgrammeStatus /></details>}
      </main>
    </div>
  );
}
