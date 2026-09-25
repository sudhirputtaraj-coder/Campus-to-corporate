'use client';
import Link from 'next/link';
import { adminLinks } from '@/lib/admin-navigation';
import { studentLinks } from './student-navigation';
import { usePathname } from 'next/navigation';

const menus: Record<string, [string, string][]> = {
  student: [...studentLinks.map(([label,href]):[string,string]=>[label,href]),['WhatsApp preferences','/student/notifications']],
  college: [['Dashboard','/college/dashboard'],['Students','/college/students'],['Departments','/college/departments'],['Batches','/college/batches'],['Courses','/college/courses'],['Trainers','/college/trainers'],['Analytics','/college/analytics']],
  admin: adminLinks.map(([label,href]):[string,string]=>[label,href]),
  employer: [['Dashboard','/employer/dashboard'],['College readiness','/employer/readiness']],
  trainer: [['Dashboard','/trainer/dashboard']],
};

export function MobileNavigation() {
  const pathname = usePathname();
  const links = menus[pathname.split('/')[1]] || [['Home','/'],['Programme','/programme'],['Sign in','/login'],['Register','/register'],['Contact','/contact']];
  return <details key={pathname} className="mobile-menu md:hidden print:hidden border-b border-slate-200 bg-white px-4 py-3">
    <summary className="cursor-pointer rounded-lg bg-green-400 px-4 py-3 font-semibold text-slate-900">Menu</summary>
    <nav aria-label="Mobile navigation" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="rounded-lg px-4 py-3 text-sm font-medium">{label}</Link>)}
    </nav>
  </details>;
}
