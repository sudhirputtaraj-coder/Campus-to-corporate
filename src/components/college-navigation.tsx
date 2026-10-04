'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collegeLinks } from '@/lib/college-navigation';
export function CollegeNavigation() {
  const pathname = usePathname();
  const selected = [...collegeLinks].sort((a, b) => b[1].length - a[1].length).find(([, href]) => pathname === href || pathname.startsWith(href + '/'))?.[1];
  return <nav aria-label="College administration" className="flex flex-wrap gap-2 border-b bg-white px-4 py-3 print:hidden">
    {collegeLinks.map(([label, href]) => <Link key={href} href={href} aria-current={selected === href ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm ${selected === href ? 'font-bold ring-2 ring-slate-700' : ''}`}>{label}</Link>)}
  </nav>;
}
