import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/auth/actions';

/** Shared by every route, including account setup and error pages. */
export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <header className="site-brand-header print:hidden">
      <Link href="/" className="site-brand-link" aria-label="Campus-to-Corporate home">
      <svg viewBox="0 200 1380 440" className="site-brand-art" aria-hidden="true" focusable="false">
        <defs>
          <filter id="c2c-letter-mask" colorInterpolationFilters="sRGB">
            {/* Select green lettering while preserving white and gold details. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 5 -2 0 -0.5" result="greenMask" />
          </filter>
          <mask id="c2c-lettering" maskUnits="userSpaceOnUse" x="0" y="0" width="1380" height="752" style={{ maskType: 'alpha' }}>
            <image href="/campus-to-corporate-logo.png" width="1380" height="752" filter="url(#c2c-letter-mask)" />
          </mask>
          <linearGradient id="c2c-tab-gradient" gradientUnits="userSpaceOnUse" x1="360" y1="242" x2="1055" y2="515">
            <stop offset="0" style={{ stopColor: 'var(--action-neon-start)' }} />
            <stop offset="1" style={{ stopColor: 'var(--action-neon-end)' }} />
          </linearGradient>
        </defs>
        <image href="/campus-to-corporate-logo.png" width="1380" height="752" />
        <rect width="1380" height="752" fill="url(#c2c-tab-gradient)" mask="url(#c2c-lettering)" />
      </svg>
      </Link>
      <div className="site-account-actions">
        <Link href="/" className="site-home-link">← Back home</Link>
        {user && <form action={logout}>
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold">Sign out</button>
        </form>}
      </div>
    </header>
  );
}
