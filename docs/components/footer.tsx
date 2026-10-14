import Link from 'next/link';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';

// The footer under each page's body (not site-wide, so it scrolls with the
// page next to the sidebar): the mark and licence on the left, where else
// Spotnote lives and the light/dark toggle on the right.
const LINKS = [
  { href: '/getting-started/installation', label: 'Get started' },
  { href: 'https://github.com/harukikuri/spotnote', label: 'GitHub' },
  { href: 'https://www.npmjs.com/package/spotnote', label: 'npm' },
  { href: 'https://github.com/harukikuri/spotnote/releases', label: 'Releases' },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t text-sm text-fd-muted-foreground">
      <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/brand/spotnote-mark-yellow.svg" alt="" width={16} height={16} />
          <span>MIT Licensed · © 2026 harukikuri</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
          <ThemeSwitch mode="light-dark" className="w-fit border-none bg-transparent p-0 shadow-none" />
        </div>
      </div>
    </footer>
  );
}
