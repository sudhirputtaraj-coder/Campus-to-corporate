import Link from 'next/link';
import {
  Target,
  BarChart3,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Building2,
  BookOpen,
  Award,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="page-navigation border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#colleges" className="hover:text-slate-900">For Colleges</a>
            <Link href="/programme" className="hover:text-slate-900">For Individuals</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2">
              Log in
            </Link>
            <Link href="/register" className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase mb-4">
            Workplace readiness for colleges and individual students
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            From Campus to Corporate
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Build the skills. Measure the readiness. Prepare for the workplace.
          </p>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Learn independently or through your college, with courses, assessments, and evidence of your skill progress.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/programme" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition shadow-sm">
              Explore Individual Programme
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 border border-slate-300 bg-white text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition">
              Request College Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">The Campus-to-Corporate Gap</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Graduates often leave with degrees but without measured workplace readiness. Colleges need visibility into skills, not just attendance.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Skills over completion', desc: 'Track Communication, Interview Skills, Problem Solving and more — with scores that update from real assessments.' },
              { icon: BarChart3, title: 'Employability Score', desc: 'A configurable readiness metric colleges and students can trust, with clear classifications and next-step recommendations.' },
              { icon: Shield, title: 'Multi-tenant by design', desc: 'Every college’s data is isolated at the database layer. Secure for institutions of any size.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Discover', desc: 'Baseline skills & profile' },
              { step: '2', title: 'Assess', desc: 'Structured evaluations' },
              { step: '3', title: 'Learn & Practice', desc: 'Targeted modules' },
              { step: '4', title: 'Placement Ready', desc: 'Score + certificate' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center mx-auto text-lg">{s.step}</div>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">Built for institutions</h2>
          <p className="text-center text-slate-600 mb-12 max-w-xl mx-auto">
            Role-based access for Super Admins, College Admins, Trainers and Students — with security enforced at the database.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[
                'Multi-college tenancy with Row Level Security',
                'Student import via CSV with validation',
                'Department & batch management',
                'Trainer-to-batch assignment (scoped access)',
                'In-app notifications & audit logging',
                'Role-specific dashboards',
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <Building2 className="w-8 h-8 mb-4 text-blue-300" />
              <h3 className="text-xl font-semibold">For College Leadership</h3>
              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                Visibility into student readiness across departments and batches. Clean reports for placement cells and management — without exposing one college’s data to another.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Users className="w-4 h-4" /> Student & trainer management</li>
                <li className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Learning path (Phase 2+)</li>
                <li className="flex items-center gap-2"><Award className="w-4 h-4" /> Certificates (Phase 4)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="colleges" className="py-16 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to measure real employability?</h2>
          <p className="mt-4 text-slate-300">Phase 1 foundation is live. Request a demo for your institution.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-100">
              Get Started
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 border border-slate-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800">
              Request College Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
          </div>
          <p>Phase 1 Foundation · Secure multi-tenant architecture</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-slate-900">Login</Link>
            <Link href="/about" className="hover:text-slate-900">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
