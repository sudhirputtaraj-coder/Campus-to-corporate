import Link from 'next/link';
import { GraduationCap, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="page-navigation border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-lg tracking-tight">
              Campus-to-Corporate
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase mb-3">
          For colleges and institutions
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Request a Demo
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          See how Campus-to-Corporate helps your placement cell measure real employability,
          not just course completion, across every department and batch.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-8">
          <div className="card-surface p-6">
            <h2 className="font-semibold text-slate-900 mb-4">What a demo covers</h2>
            <ul className="space-y-3">
              {[
                'A walkthrough of the student, trainer, and college admin experience',
                'How the Employability Score and skill gap tracking works',
                'Multi-batch and department-level analytics for placement cells',
                'Onboarding timeline and pricing for your institution',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-surface p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Get in touch</h2>
            <p className="text-sm text-slate-600 mb-6">
              Email or call us with your college name and a good time to connect. We typically
              respond within one business day.
            </p>
            
              <a href="mailto:sudhirputtaraj@gmail.com?subject=Campus-to-Corporate%20Demo%20Request"
              className="btn-neon w-full mb-3"
            >
              <Mail className="w-4 h-4" />
              sudhirputtaraj@gmail.com
            </a>
            
              <a href="tel:+919945041414"
              className="inline-flex items-center justify-center gap-2 w-full border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              <Phone className="w-4 h-4" />
              +91 99450 41414
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900">Back to Campus-to-Corporate</Link>
        </div>
      </footer>
    </div>
  );
}