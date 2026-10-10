import { LandingVideo } from '@/components/landing-video';
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
          <nav aria-label="Homepage navigation" className="hidden md:flex items-center gap-4 text-sm text-slate-600">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#colleges" className="hover:text-slate-900">For Colleges</a>
            <Link href="/programme" className="hover:text-slate-900">For Individuals</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
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
        <LandingVideo />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <p className="landing-eyebrow uppercase mb-4" style={{ color: '#000000', fontWeight: 750 }}>
            Workplace readiness for colleges and individual students
          </p>
          <h1 className="landing-hero-title landing-journey mx-auto" aria-label="Campus Corporate">
            <span className="journey-word">
              Campus
              <svg className="journey-symbol journey-cap" viewBox="0 0 180 140" fill="none" aria-hidden="true">
                <path d="M42 68v32c22 23 69 23 92 0V68" fill="#123d2c" stroke="#f3f8f5" strokeWidth="3" />
                <path d="M8 55 88 20l82 35-82 36Z" fill="#102a20" stroke="#f3f8f5" strokeWidth="3" strokeLinejoin="round" />
                <path d="m88 55 57 15v39" stroke="#00e676" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="88" cy="55" r="4" fill="#1aff8c" />
                <path d="m145 106-7 21h14Z" fill="#00e676" />
              </svg>
            </span>{' '}
            <span className="journey-word">
              Corporate
              <svg className="journey-symbol journey-tie" viewBox="0 0 100 160" fill="none" aria-hidden="true">
                <path d="m6 9 27 5 17 18-21 22Z M94 9l-27 5-17 18 21 22Z" fill="#fff" stroke="#123d2c" strokeWidth="3" strokeLinejoin="round" />
                <path d="m36 29 28 0-5 24H41Z" fill="#00e676" stroke="#102a20" strokeWidth="3" strokeLinejoin="round" />
                <path d="m41 53-14 73 23 26 23-26-14-73Z" fill="#102a20" stroke="#f3f8f5" strokeWidth="3" strokeLinejoin="round" />
                <path d="m48 64-9 57" stroke="#2b6148" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl max-w-2xl mx-auto" style={{ color: '#000000', fontWeight: 750 }}>
            Build the skills. Measure the readiness. Prepare for the workplace.
          </p>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: '#000000', fontWeight: 700 }}>
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
            <h2 className="landing-section-title text-slate-900 max-w-3xl mx-auto">Connecting Academic Learning with Workplace Readiness</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Help students turn their academic knowledge into practical workplace skills, with structured learning, meaningful assessments and clear progress reports for colleges.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Practical skill development', desc: 'Develop communication, problem solving and professional skills through focused learning and practice.' },
              { icon: BarChart3, title: 'Evidence-based progress', desc: 'Understand strengths and areas for improvement through assessment results and skill readiness scores.' },
              { icon: Shield, title: 'Dedicated college oversight', desc: 'Review department, batch and student performance with access restricted to authorised college staff.' },
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
              { step: '4', title: 'Review Your Readiness', desc: 'Track progress and plan your next steps' },
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
            Give college teams a clear view of learning progress, skill development and students who need additional support.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[
                'Separate access for each college',
                'Department and batch assignment through validated CSV uploads',
                'Department & batch management',
                'Trainer assignments for authorised batches',
                'Assessment results and employability reports',
                'Dashboards tailored to each account type',
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
                <li className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Structured learning paths</li>
                <li className="flex items-center gap-2"><Award className="w-4 h-4" /> Certificates when course requirements are met</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="colleges" className="py-16 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Help your students prepare for the workplace</h2>
          <p className="mt-4 text-slate-300">Explore how structured learning and readiness insights can support your college’s placement preparation.</p>
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
          <p>Practical learning. Measurable progress. Workplace readiness.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-slate-900">Login</Link>
            <Link href="/about" className="hover:text-slate-900">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
