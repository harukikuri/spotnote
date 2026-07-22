import {
  LuMousePointerClick,
  LuMessageSquare,
  LuFileJson,
  LuLink,
  LuCodeXml,
} from 'react-icons/lu';
import { SiReact, SiVuedotjs, SiSvelte, SiVite } from 'react-icons/si';
import type { ReactNode } from 'react';

// ── Build Time: data flow diagram ───────────────────────────────────

function FlowBox({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid var(--color-fd-border, #e5e5e5)',
        background: muted ? 'transparent' : 'var(--color-fd-card, #fff)',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--color-fd-foreground, #171717)',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

function AccentBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid rgba(99,102,241,0.3)',
        background: 'rgba(99,102,241,0.06)',
        fontSize: 14,
        fontWeight: 600,
        color: '#6366f1',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" style={{ flexShrink: 0 }}>
      <line x1="0" y1="6" x2="14" y2="6" stroke="var(--color-fd-border, #cbd5e1)" strokeWidth="1.5" />
      <polygon points="13,2 20,6 13,10" fill="var(--color-fd-border, #cbd5e1)" />
    </svg>
  );
}

function ConvergeArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <svg width="36" height="80" viewBox="0 0 36 80" fill="none" style={{ flexShrink: 0 }}>
        {/* Top branch */}
        <path d="M0,12 C18,12 18,40 36,40" stroke="var(--color-fd-border, #cbd5e1)" strokeWidth="1.5" fill="none" />
        {/* Middle branch */}
        <line x1="0" y1="40" x2="36" y2="40" stroke="var(--color-fd-border, #cbd5e1)" strokeWidth="1.5" />
        {/* Bottom branch */}
        <path d="M0,68 C18,68 18,40 36,40" stroke="var(--color-fd-border, #cbd5e1)" strokeWidth="1.5" fill="none" />
        {/* Arrowhead */}
        <polygon points="30,36 36,40 30,44" fill="var(--color-fd-border, #cbd5e1)" />
      </svg>
    </div>
  );
}

export function BuildChart() {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border bg-fd-card p-6">
      <div className="flex items-center justify-between min-w-fit">
        {/* Source files */}
        <div className="flex flex-col gap-2">
          <FlowBox>
            <SiReact size={16} color="#61dafb" />
            .tsx
          </FlowBox>
          <FlowBox>
            <SiVuedotjs size={16} color="#4fc08d" />
            .vue
          </FlowBox>
          <FlowBox>
            <SiSvelte size={16} color="#ff3e00" />
            .svelte
          </FlowBox>
        </div>

        {/* Converge into Vite */}
        <ConvergeArrow />

        {/* Vite build container */}
        <div
          style={{
            border: '1.5px dashed rgba(189,147,249,0.4)',
            borderRadius: 12,
            padding: '10px 14px',
            background: 'rgba(189,147,249,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Vite label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#bd93f9' }}>
            <SiVite size={14} color="#bd93f9" />
            Vite Build
          </div>
          {/* Transforms inside Vite */}
          <div className="flex flex-col gap-1.5">
            <FlowBox muted>
              <SiReact size={16} color="#61dafb" />
              Babel
            </FlowBox>
            <FlowBox muted>
              <SiVuedotjs size={16} color="#4fc08d" />
              NodeTransform
            </FlowBox>
            <FlowBox muted>
              <SiSvelte size={16} color="#ff3e00" />
              Preprocessor
            </FlowBox>
          </div>
        </div>

        <Arrow />

        {/* Output: data-spotnote-id */}
        <AccentBox>
          <LuCodeXml size={16} />
          <code style={{ fontSize: 13 }}>data-spotnote-id</code>
        </AccentBox>

        <Arrow />

        {/* Manifest */}
        <AccentBox>
          <LuFileJson size={16} />
          manifest.json
        </AccentBox>
      </div>
    </div>
  );
}

// ── Runtime: step list ──────────────────────────────────────────────

interface Step {
  icon: ReactNode;
  label: string;
  detail: string;
}

const runtimeSteps: Step[] = [
  { icon: <LuMousePointerClick />, label: 'Click Element', detail: 'Select any element on the page' },
  { icon: <LuMessageSquare />, label: 'Leave Note', detail: 'Write feedback for the element' },
  { icon: <LuFileJson />, label: 'Lookup Manifest', detail: 'Resolves data-spotnote-id to source code location' },
  { icon: <LuLink />, label: 'Code Context', detail: 'Notes come with code context' },
];

export function RuntimeChart() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card px-6 py-5">
      <div className="flex flex-col gap-5">
        {runtimeSteps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                background: 'rgba(99,102,241,0.08)',
                color: '#6366f1',
                marginTop: 1,
              }}
            >
              {i + 1}
            </div>
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 32, height: 32, borderRadius: 8, fontSize: 16, color: '#6366f1' }}
            >
              {step.icon}
            </div>
            <div style={{ paddingTop: 1 }}>
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--color-fd-foreground, #171717)', lineHeight: '20px' }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: '18px',
                  color: 'var(--color-fd-muted-foreground, #737373)',
                  marginTop: 1,
                }}
              >
                {step.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
