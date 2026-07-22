'use client';

import Link from 'next/link';
import { SiGithub } from 'react-icons/si';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-fd-background/80 backdrop-blur-sm">
      <div
        className="mx-auto flex h-full items-center px-4"
        style={{ maxWidth: 'var(--fd-layout-width, 97rem)' }}
      >
        <Link href="/docs" className="font-semibold text-fd-foreground">
          Spotnote
        </Link>
        <div className="flex-1" />
        <nav className="flex items-center gap-3">
          <FullSearchTrigger />
          <a
            href="https://github.com/kuri-sun/spotnote"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md p-2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          >
            <SiGithub size={18} />
          </a>
          <ThemeSwitch mode="light-dark" className="w-fit border-none bg-transparent p-0 shadow-none" />
        </nav>
      </div>
    </header>
  );
}
