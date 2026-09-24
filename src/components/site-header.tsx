import Link from 'next/link';

/** Shared by every route, including account setup and error pages. */
export function SiteHeader() {
  return (
    <header className="site-brand-header print:hidden">
      <Link href="/" className="site-brand-link" aria-label="Campus-to-Corporate home">
        <img
          src="/campus-to-corporate-logo.png"
          alt="C2C — Campus to Corporate"
          width={1380}
          height={752}
          className="site-brand-image"
        />
      </Link>
    </header>
  );
}
