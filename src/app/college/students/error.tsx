'use client';
import Link from 'next/link';
export default function StudentDirectoryError({reset}:{reset:()=>void}) {
  return <main className="max-w-xl mx-auto p-8"><h1 className="text-xl font-bold">Student information could not be loaded</h1>
    <p className="mt-3">Please try again. If the problem continues, contact the platform administrator.</p>
    <button onClick={reset} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-white">Try again</button>
    <Link href="/college/dashboard" className="ml-4 text-blue-700">Back to dashboard</Link>
  </main>;
}
