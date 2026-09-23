import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { EnrollBatchForm } from './enroll-batch-form';

export default async function CollegeCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('user_id', user.id)
    .single();

  if (profile?.status !== 'ACTIVE' || (profile?.role !== 'COLLEGE_ADMIN' && profile?.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  let allowedCourseIds: string[] | null = null;
  if (profile.role === 'COLLEGE_ADMIN') {
    allowedCourseIds = [];
    for (let start=0; ; start+=500) {
      const assignments = await supabase.from('college_courses').select('course_id').order('college_id').order('course_id').range(start,start+499);
      if (assignments.error) throw new Error('Unable to load college courses. Apply migration 016, then try again.');
      allowedCourseIds.push(...assignments.data.map(a=>a.course_id));
      if (assignments.data.length<500) break;
    }
  }
  let coursesQuery = supabase
    .from('courses')
    .select('id, title, category, level, status')
    .eq('status', 'ACTIVE')
    .order('title');
  if (allowedCourseIds!==null) coursesQuery=coursesQuery.in('id',allowedCourseIds.length?allowedCourseIds:['00000000-0000-0000-0000-000000000000']);
  const {data:courses,error:courseError}=await coursesQuery;
  if(courseError)throw new Error('Unable to load courses.');

  const { data: batches, error:batchError } = await supabase
    .from('batches')
    .select('id, name, academic_year, status')
    .eq('status', 'ACTIVE')
    .order('name');
  if(batchError)throw new Error('Unable to load batches.');

  const { data: enrollments, error:enrolmentError } = await supabase
    .from('enrollments')
    .select('id, status, completion_percentage, course:courses(title), student:students(register_number)')
    .order('created_at', { ascending: false })
    .limit(50);
  if(enrolmentError)throw new Error('Unable to load enrolments.');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/college/dashboard" className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-slate-900" />
              <span className="font-semibold text-slate-900">College Admin</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <Link href="/college/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span className="text-slate-900 font-medium">Courses</span>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Course Enrollment</h1>
        {profile.role==='COLLEGE_ADMIN' && <p className="mb-5 text-sm text-slate-600">Choose a course assigned to your college by the platform administrator. Only active student accounts in the selected batch will be enrolled. Existing progress stays unchanged.</p>}

        <EnrollBatchForm
          courses={(courses || []).map((c) => ({ id: c.id, title: c.title, category: c.category }))}
          batches={(batches || []).map((b) => ({ id: b.id, name: b.name, academic_year: b.academic_year }))}
        />

        <section className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent enrollments (your college)</h2>
          </div>
          {!enrollments || enrollments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No enrollments yet. Assign a course to a batch above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((e: any) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{e.student?.register_number || '—'}</td>
                      <td className="px-4 py-3">{e.course?.title || '—'}</td>
                      <td className="px-4 py-3">{Number(e.completion_percentage) || 0}%</td>
                      <td className="px-4 py-3">{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
