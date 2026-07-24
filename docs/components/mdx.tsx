import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import { CodeBlockTabsTrigger } from 'fumadocs-ui/components/codeblock';
import { SiNpm, SiPnpm, SiYarn, SiReact, SiSolid, SiVuedotjs } from 'react-icons/si';
import { BrowserFrame } from './browser-frame';
import { SpotnoteDemo } from './spotnote-demo';
import { StampFlow, PickFlow } from './workflow-chart';
import { SpotnoteFullDemo } from './spotnote-full-demo';

const tabIcons: Record<string, ReactNode> = {
  npm: <SiNpm />,
  pnpm: <SiPnpm />,
  yarn: <SiYarn />,
  React: <SiReact />,
  Solid: <SiSolid />,
  Vue: <SiVuedotjs />,
};

function CustomCodeBlockTabsTrigger(
  props: React.ComponentProps<typeof CodeBlockTabsTrigger>,
): React.ReactNode {
  const label = typeof props.children === 'string' ? props.children : '';
  const icon = tabIcons[label];
  return (
    <CodeBlockTabsTrigger {...props}>
      {icon}
      {props.children}
    </CodeBlockTabsTrigger>
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    CodeBlockTabsTrigger: CustomCodeBlockTabsTrigger,
    BrowserFrame,
    SpotnoteDemo,
    StampFlow,
    PickFlow,
    SpotnoteFullDemo,
    ...components,
  };
}
