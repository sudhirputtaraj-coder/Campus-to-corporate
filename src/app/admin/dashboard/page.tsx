import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, GraduationCap, UserCheck, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function AdminDashboard() {
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

  if (profile?.role !== 'SUPER_ADMIN') redirect('/login');

  const [
    { count: collegesCount },
    { count: activeColleges },
    { count: studentsCount },
    { count: trainersCount },
  ] = await Promise.all([
    supabase.from('colleges').select('*', { count: 'exact', head: true }),
    supabase.from('colleges').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('trainers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            <span className="font-semibold text-slate-900">Super Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{profile?.full_name}</span>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Colleges', value: collegesCount ?? 0, icon: Building2 },
            { label: 'Active Colleges', value: activeColleges ?? 0, icon: Building2 },
            { label: 'Total Students', value: studentsCount ?? 0, icon: Users },
            { label: 'Total Trainers', value: trainersCount ?? 0, icon: UserCheck },
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
            <Link href="/admin/account" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Account Settings</Link>
            <Link href="/admin/skills" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">Manage Skill Modules</Link>
            <Link href="/admin/programme" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Individual Programme Settings
            </Link>
            <Link href="/admin/courses" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Manage Courses
            </Link>
            <Link href="/admin/employability" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Employability Config
            </Link>
            <Link href="/admin/colleges" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Manage Colleges
            </Link>
            <Link href="/admin/users" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
              Manage Users
            
            </Link>
            <span className="px-4 py-2 text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg">
              Analytics — Coming in future phase
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
