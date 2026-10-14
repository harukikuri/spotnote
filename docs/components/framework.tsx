// A framework's logo and name, for tables and lists. Monochrome, like the
// install tabs' icons (mdx.tsx tabIcons), so it follows the docs theme.
import type { IconType } from 'react-icons';
import { SiNextdotjs, SiPreact, SiReact, SiSolid, SiSvelte, SiVuedotjs } from 'react-icons/si';

const icons: Record<string, IconType> = {
  React: SiReact,
  Solid: SiSolid,
  Vue: SiVuedotjs,
  Svelte: SiSvelte,
  Preact: SiPreact,
  'Next.js': SiNextdotjs,
};

export function Framework({ name, children }: { name: string; children?: React.ReactNode }) {
  const Icon = icons[name];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
      {children ?? name}
    </span>
  );
}
