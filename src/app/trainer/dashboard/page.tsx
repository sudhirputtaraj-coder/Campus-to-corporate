import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function TrainerDashboard() {
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

  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data: assignments } = await supabase
    .from('trainer_batch_assignments')
    .select('*, batch:batches(*, department:departments(name))')
    .eq('trainer_id', trainer?.id || '')
    .eq('status', 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            <span className="font-semibold text-slate-900">Trainer</span>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Dashboard</h1>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">My Batches</h2>
          {!assignments || assignments.length === 0 ? (
            <p className="text-slate-500 text-sm">No batches assigned yet.</p>
          ) : (
            <ul className="space-y-3">
              {assignments.map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{a.batch?.name}</p>
                    <p className="text-sm text-slate-500">
                      {a.batch?.department?.name || '—'} · {a.batch?.academic_year || '—'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Coming soon</h2>
          <p className="text-sm text-slate-500">
            Attendance, Activities, Evaluations and Reports will be available in later phases.
          </p>
        </div>
      </main>
    </div>
  );
}
