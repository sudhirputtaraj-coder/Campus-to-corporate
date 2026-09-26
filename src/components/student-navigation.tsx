'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export const studentLinks = [['Dashboard','/student/dashboard'],['My Learning Path','/student/learning'],['Communication Coach','/student/communication-coach'],['Assessments','/student/assessments'],['My Skill Scores','/student/skills'],['Employability Summary','/student/employability'],['Certificates','/student/certificates']] as const;
export function StudentNavigation() {
 const pathname=usePathname();return <nav aria-label="Student navigation" className="hidden md:flex flex-wrap gap-2 border-b bg-white px-6 py-3">{studentLinks.map(([label,href])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} className={`rounded-lg px-3 py-2 text-sm ${pathname===href?'font-bold ring-2 ring-slate-700':''}`}>{label}</Link>)}</nav>;
}
