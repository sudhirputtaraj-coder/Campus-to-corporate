import Link from 'next/link';

/** Shared by every route, including account setup and error pages. */
export function SiteHeader() {
  return (
    <header className="site-brand-header print:hidden">
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <filter id="c2c-neon-green" colorInterpolationFilters="sRGB">
            {/* Select green lettering while preserving white and gold details. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 5 -2 0 -0.5" result="greenMask" />
            <feFlood floodColor="#1aff8c" result="tabGreen" />
            <feComposite in="tabGreen" in2="greenMask" operator="in" result="greenLetters" />
            <feComposite in="greenLetters" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>
      <Link href="/" className="site-brand-link" aria-label="Campus-to-Corporate home">
        <img
          src="/campus-to-corporate-logo.png"
          alt="C2C — Campus to Corporate"
          width={1380}
          height={752}
          className="site-brand-image"
        />
      </Link>
      <Link href="/" className="site-home-link">← Back home</Link>
    </header>
  );
}
