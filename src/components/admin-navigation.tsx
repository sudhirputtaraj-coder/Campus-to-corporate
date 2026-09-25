'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminLinks } from '@/lib/admin-navigation';
export function AdminNavigation() {
  const pathname=usePathname();
  return <nav aria-label="Super Admin navigation" className="hidden md:flex flex-wrap gap-2 border-b border-slate-200 bg-white px-6 py-3 print:hidden">
    {adminLinks.map(([label,href])=>{
      const active=pathname===href||pathname.startsWith(href+'/');
      return <Link key={href} href={href} aria-current={active?'page':undefined} className={`rounded-lg px-3 py-2 text-sm ${active?'font-bold ring-2 ring-slate-700':''}`}>{label}</Link>;
    })}
  </nav>;
}
