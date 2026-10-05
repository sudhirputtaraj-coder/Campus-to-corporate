'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { createCourse } from '@/lib/learning/actions';
import { useRouter } from 'next/navigation';

export function CreateCourseForm({ skills, selectedSkill = '' }: { skills: { id: string; name: string; status: string }[]; selectedSkill?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCourse(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
      if (res.id) router.push(`/admin/courses/${res.id}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <h2 className="font-semibold text-slate-900">Create draft course</h2><p className="text-sm text-slate-600">Start with a hidden course. Add modules and lessons, preview the content, then publish when ready.</p>
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <input
            name="title"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Email Etiquette"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="course-skill">Skill *</label>
          <select id="course-skill" name="skill_id" defaultValue={selectedSkill} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="" disabled>Choose a skill</option>
            {skills.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.status !== 'ACTIVE' ? ' (draft / hidden)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
          <select name="level" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
          <input
            name="duration_minutes"
            type="number"
            min={0}
            defaultValue={60}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          name="description"
          rows={2}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Brief course description"
        />
      </div>
      {!skills.length && <p className="text-sm text-amber-700">Add a skill in Manage Skills first, then create its courses here.</p>}
      <button
        type="submit"
        disabled={pending || !skills.length}
        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Create Course
      </button>
    </form>
  );
}
