'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collegeLinks } from '@/lib/college-navigation';
export function CollegeNavigation() {
  const pathname=usePathname();
  return <nav aria-label="College administration" className="hidden md:flex flex-wrap gap-2 border-b bg-white px-6 py-3 print:hidden">
    {collegeLinks.map(([label,href])=><Link key={href} href={href} aria-current={pathname===href||pathname.startsWith(href+'/')?'page':undefined} className={`rounded-lg px-3 py-2 text-sm ${pathname===href||pathname.startsWith(href+'/')?'font-bold ring-2 ring-slate-700':''}`}>{label}</Link>)}
  </nav>;
}
