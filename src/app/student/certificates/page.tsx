import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Award, Calendar, CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function StudentCertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) redirect('/student/dashboard');

  // Sync missing certificates for 100% completed courses (e.g. completed prior to feature deployment)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', student.id)
    .gte('completion_percentage', 100);

  if (enrollments && enrollments.length > 0) {
    const { checkAndIssueCertificate } = await import('@/lib/learning/actions');
    for (const enr of enrollments) {
      await checkAndIssueCertificate(student.id, enr.course_id);
    }
  }

  const { data: certificates, error: certificateError } = await supabase
    .from('certificates')
    .select('*, course:courses(id, title, category, level)')
    .eq('student_id', student.id)
    .order('issue_date', { ascending: false });
  if (certificateError) throw new Error('Unable to load certificates. Please try again.');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="page-navigation bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-2 text-slate-900 font-bold text-lg hover:opacity-80"
          >
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
          </Link>
          <span className="text-slate-300">|</span>

        </div>
        <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
          <Home className="w-4 h-4" />
        </Link>
        <form action={logout}>
          <button type="submit" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
            <p className="text-sm text-slate-500 mt-1">
              Official certificates earned upon completing courses and assessments.
            </p>
          </div>
        </div>

        {!certificates || certificates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No certificates earned yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Complete all active lessons and pass the formal assessments in a course to earn a certificate.
            </p>
            <Link
              href="/student/learning"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Go to My Learning
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {certificates.map((cert: any) => (
              <div
                key={cert.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Certificate Earned
                    </span>
                    <span className="text-xs font-mono text-slate-400">{cert.certificate_number}</span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    {cert.course?.title || 'Course Certificate'}
                  </h2>
                  {cert.course?.category && (
                    <p className="text-xs text-slate-500 mb-4">{cert.course.category}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Issued {new Date(cert.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <Link
                    href={`/student/certificates/${cert.id}`}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    View / Print →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
