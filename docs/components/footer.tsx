import Link from 'next/link';

// Site-wide footer: the mark and licence on the left, where else Spotnote lives
// on the right.
const LINKS = [
  { href: '/getting-started/installation', label: 'Get started' },
  { href: 'https://github.com/harukikuri/spotnote', label: 'GitHub' },
  { href: 'https://www.npmjs.com/package/spotnote', label: 'npm' },
  { href: 'https://github.com/harukikuri/spotnote/releases', label: 'Releases' },
];

export function Footer() {
  return (
    <footer className="border-t text-sm text-fd-muted-foreground">
      <div
        className="mx-auto flex flex-col gap-4 px-7 py-8 sm:flex-row sm:items-center sm:justify-between"
        style={{ maxWidth: 'var(--fd-layout-width, 97rem)' }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/brand/spotnote-mark-light.svg" alt="" width={16} height={16} className="dark:hidden" />
          <img src="/brand/spotnote-mark-dark.svg" alt="" width={16} height={16} className="hidden dark:block" />
          <span>MIT Licensed · © 2026 harukikuri</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map(({ href, label }) => {
            const external = href.startsWith('http');
            return (
              <Link
                key={href}
                href={href}
                {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
                className="transition-colors hover:text-fd-foreground"
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
