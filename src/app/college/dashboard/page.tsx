import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, UserCheck, Layers, BookOpen, LogOut, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function CollegeDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profile?.status !== 'ACTIVE' || (profile?.role !== 'COLLEGE_ADMIN' && profile?.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  // RLS will restrict to own college(s)
  const [
    { count: studentsCount },
    { count: trainersCount },
    { count: deptsCount },
    { count: batchesCount },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('trainers').select('*', { count: 'exact', head: true }),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('batches').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
            <span className="font-semibold text-slate-900">College Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{profile?.full_name}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">College Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Students', value: studentsCount ?? 0, icon: Users },
            { label: 'Trainers', value: trainersCount ?? 0, icon: UserCheck },
            { label: 'Departments', value: deptsCount ?? 0, icon: Layers },
            { label: 'Batches', value: batchesCount ?? 0, icon: BookOpen },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{m.label}</p>
                <m.icon className="w-5 h-5 text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/college/students" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Students & Progress
            </Link>
            <Link href="/college/students/import" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Assign Students from CSV
            </Link>
            <Link href="/college/departments" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Departments
            </Link>
            <Link href="/college/batches" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Batches
            </Link>
            <Link href="/college/trainers" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Trainers
            </Link>
            <Link href="/college/courses" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Courses / Enroll
            </Link>
                        <Link href="/college/analytics" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Employability Analytics
            </Link>
            <Link href="/college/analytics" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Employability Analytics
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
