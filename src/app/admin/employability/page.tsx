import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { WeightEditor } from './weight-editor';

export default async function AdminEmployabilityPage() {
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

  if (profile?.role !== 'SUPER_ADMIN') redirect('/login');

  const { data: weights } = await supabase
    .from('employability_score_weights')
    .select('id, skill_id, weight_percent, is_active, skill:skills(id, code, name)')
    .order('weight_percent', { ascending: false });

  const { data: classifications } = await supabase
    .from('employability_classifications')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  const rows = (weights || []).map((w: any) => ({
    skill_id: w.skill_id,
    code: w.skill?.code || '',
    name: w.skill?.name || 'Unknown',
    weight_percent: Number(w.weight_percent),
  }));

  const sum = rows.reduce((a, r) => a + r.weight_percent, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Super Admin</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <Link href="/admin/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span className="text-slate-900 font-medium">Employability</span>
            </nav>
          </div>
          <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
            <Home className="w-4 h-4" />
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Employability Score Configuration</h1>
        <p className="text-sm text-slate-500 mb-8">
          Weights and classification bands are configurable. Scores are recomputed from formal skill
          summaries when skill data changes or a student refreshes their score.
        </p>

        <section className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Skill weights (%)</h2>
            <span
              className={`text-sm font-medium ${
                Math.abs(sum - 100) < 0.01 ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              Total: {sum}%
              {Math.abs(sum - 100) >= 0.01 ? ' (should be 100)' : ''}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No weights found. Run migration 016_phase3_employability.sql after Phase 2A skills exist.
            </p>
          ) : (
            <WeightEditor rows={rows} />
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Classification bands (active)</h2>
          {!classifications || classifications.length === 0 ? (
            <p className="text-sm text-slate-500">No classifications seeded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Label</th>
                  <th className="py-2 font-medium">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classifications.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-mono text-xs text-slate-600">{c.code}</td>
                    <td className="py-2 text-slate-900">{c.label}</td>
                    <td className="py-2 text-slate-700">
                      {c.min_score} – {c.max_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Labels and thresholds are stored in employability_classifications and can be adjusted in SQL
            or a future admin editor.
          </p>
        </section>
      </main>
    </div>
  );
}
