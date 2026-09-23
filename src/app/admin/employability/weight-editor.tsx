'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { updateEmployabilityWeight } from '@/lib/employability/actions';

type Row = { skill_id: string; code: string; name: string; weight_percent: number };

export function WeightEditor({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setWeight(skillId: string, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.skill_id === skillId ? { ...r, weight_percent: value } : r))
    );
  }

  function saveOne(skillId: string) {
    const row = rows.find((r) => r.skill_id === skillId);
    if (!row) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await updateEmployabilityWeight(skillId, row.weight_percent);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(`Updated ${row.name}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
      {message && (
        <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{message}</div>
      )}
      {rows.map((r) => (
        <div
          key={r.skill_id}
          className="flex flex-col sm:flex-row sm:items-center gap-2 border border-slate-100 rounded-lg px-3 py-2"
        >
          <div className="sm:w-48">
            <p className="text-sm font-medium text-slate-900">{r.name}</p>
            <p className="text-xs text-slate-400 font-mono">{r.code}</p>
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={r.weight_percent}
            onChange={(e) => setWeight(r.skill_id, parseFloat(e.target.value) || 0)}
            className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => saveOne(r.skill_id)}
            className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      ))}
    </div>
  );
}
