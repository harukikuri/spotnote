'use client';

import Link from 'next/link';
import { SiGithub } from 'react-icons/si';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import plugin from '../../plugin/package.json';

const VERSION = `v${plugin.version.split('.').slice(0, 2).join('.')}`;

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-fd-background/80 backdrop-blur-sm">
      <div
        className="mx-auto flex h-full items-center px-4"
        style={{ maxWidth: 'var(--fd-layout-width, 97rem)' }}
      >
        <Link href="/" className="ps-3" aria-label="Spotnote">
          {/* The light-theme logo is dark ink, and the other way round. */}
          <img src="/brand/spotnote-logo-light.svg" alt="Spotnote" width={118} height={22} className="h-[22px] w-auto dark:hidden" />
          <img src="/brand/spotnote-logo-dark.svg" alt="Spotnote" width={118} height={22} className="hidden h-[22px] w-auto dark:block" />
        </Link>
        {/* The plugin's version as major.minor, like the pill beside Tailwind CSS's logo. */}
        <span className="ms-4 rounded-full bg-fd-foreground/5 px-2.5 text-xs/[22px] font-medium text-fd-foreground/80 dark:bg-fd-foreground/10">
          {VERSION}
        </span>
        <div className="flex-1" />
        <nav className="flex items-center gap-3">
          <FullSearchTrigger />
          <a
            href="https://github.com/harukikuri/spotnote"
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
