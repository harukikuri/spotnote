import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Spotnote',
    },
    themeSwitch: {
      enabled: false,
    },
    searchToggle: {
      enabled: false,
    },
  };
}
