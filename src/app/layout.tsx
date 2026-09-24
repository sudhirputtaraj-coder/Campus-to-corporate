import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { MobileNavigation } from '@/components/mobile-navigation';

export const metadata: Metadata = {
  title: 'Campus-to-Corporate | Employability Platform',
  description:
    'Build the skills. Measure the readiness. Prepare for the workplace. AI-powered employability & corporate readiness platform for colleges.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50">
        <SiteHeader />
        <MobileNavigation />
        {children}
      </body>
    </html>
  );
}
