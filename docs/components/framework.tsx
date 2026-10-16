// A framework's logo and name, for tables and lists. Logos in their brand
// colour; the darker ones get a lighter shade in dark mode so they stay
// visible.
import type { IconType } from 'react-icons';
import { SiAstro, SiPreact, SiReact, SiSolid, SiSvelte, SiVuedotjs } from 'react-icons/si';

const icons: Record<string, { Icon: IconType; color?: string }> = {
  React: { Icon: SiReact, color: 'text-[#61DAFB]' },
  Solid: { Icon: SiSolid, color: 'text-[#2C4F7C] dark:text-[#5B8FD1]' },
  Vue: { Icon: SiVuedotjs, color: 'text-[#4FC08D]' },
  Svelte: { Icon: SiSvelte, color: 'text-[#FF3E00]' },
  Astro: { Icon: SiAstro, color: 'text-[#BC52EE]' },
  Preact: { Icon: SiPreact, color: 'text-[#673AB8] dark:text-[#9A74E0]' },
};

export function Framework({ name, children }: { name: string; children?: React.ReactNode }) {
  const icon = icons[name];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {icon && <icon.Icon aria-hidden className={`size-4 shrink-0 ${icon.color ?? ''}`} />}
      {children ?? name}
    </span>
  );
}
