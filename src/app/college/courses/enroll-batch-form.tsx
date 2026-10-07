'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { enrollBatchInCourse } from '@/lib/learning/actions';

export function EnrollBatchForm({
  courses,
  batches,
  departments = [],
}: {
  courses: { id: string; title: string; category: string }[];
  batches: { id: string; name: string; academic_year: string | null; department_id?: string | null }[];
  departments?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const visibleBatches = batches.filter(b => !departmentId || (departmentId === 'unassigned' ? !b.department_id : b.department_id === departmentId));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!courseId || !batchId) {
      setError('Select both a course and a batch.');
      return;
    }
    startTransition(async () => {
      const res = await enrollBatchInCourse(batchId, courseId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSuccess(`${res.enrolled} new enrolment(s). ${res.existing} existing enrolment(s) kept unchanged.`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-slate-900">Assign course to batch</h2>
      <p className="text-sm text-slate-500">
        All active students in the selected batch will be enrolled in the course.
      </p>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">{success}</div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">Select course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.category})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="enrolment-department" className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select id="enrolment-department" value={departmentId} onChange={e => { setDepartmentId(e.target.value); setBatchId(''); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All departments</option>
            <option value="unassigned">No department assigned</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">Select batch…</option>
            {visibleBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.academic_year ? ` · ${b.academic_year}` : ''}
                {b.department_id ? ` · ${departments.find(d => d.id === b.department_id)?.name || 'Department'}` : ' · No department'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!visibleBatches.length && <p role="status" className="text-sm text-slate-600">No active batches in this department yet. Create a batch under Batches and select this department.</p>}
      <button
        type="submit"
        disabled={pending || !courseId || !batchId}
        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Enroll batch
      </button>
    </form>
  );
}
