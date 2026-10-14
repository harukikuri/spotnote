import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import { CodeBlockTabsTrigger } from 'fumadocs-ui/components/codeblock';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import {
  SiNpm,
  SiPnpm,
  SiYarn,
  SiReact,
  SiSolid,
  SiVuedotjs,
  SiSvelte,
  SiClaude,
  SiCursor,
  SiGooglegemini,
} from 'react-icons/si';
// OpenAI's mark isn't in Simple Icons.
import { RiOpenaiFill } from 'react-icons/ri';
import { BrowserFrame } from './browser-frame';
import { SpotnoteDemo } from './spotnote-demo';
import { Diagram } from './diagram';
import { SpotnoteFullDemo } from './spotnote-full-demo';
import { LauncherIcon } from './launcher-icon';
import { PinIcon } from './pin-icon';

const tabIcons: Record<string, ReactNode> = {
  npm: <SiNpm />,
  pnpm: <SiPnpm />,
  yarn: <SiYarn />,
  React: <SiReact />,
  Solid: <SiSolid />,
  Vue: <SiVuedotjs />,
  Svelte: <SiSvelte />,
  'Claude Code': <SiClaude />,
  Codex: <RiOpenaiFill />,
  Cursor: <SiCursor />,
  'Gemini CLI': <SiGooglegemini />,
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
    Step,
    Steps,
    Accordion,
    Accordions,
    BrowserFrame,
    SpotnoteDemo,
    Diagram,
    SpotnoteFullDemo,
    LauncherIcon,
    PinIcon,
    ...components,
  };
}
