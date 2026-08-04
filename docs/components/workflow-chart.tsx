import {
  LuScanSearch,
  LuMousePointerClick,
  LuMessageSquare,
  LuClipboardCopy,
  LuCodeXml,
} from 'react-icons/lu';
import { SiReact, SiSvelte, SiVuedotjs, SiVite } from 'react-icons/si';
import type { ReactNode } from 'react';

// ── Dev time: how the stamp gets into the DOM ───────────────────────

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

export function StampFlow() {
  return (
    <div className="not-prose my-6 rounded-xl border p-6">
      <div className="flex items-center justify-center">
        {/* Source frameworks */}
        <div className="flex flex-col gap-2">
          <FlowBox>
            <SiReact size={16} color="#61dafb" />
            React
          </FlowBox>
          <FlowBox>
            <SiVuedotjs size={16} color="#4fc08d" />
            Vue
          </FlowBox>
          <FlowBox>
            <SiSvelte size={16} color="#ff3e00" />
            Svelte
          </FlowBox>
        </div>

        {/* Converge into the Vite dev server */}
        <ConvergeArrow />

        {/* Vite dev container (serve only) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#bd93f9', whiteSpace: 'nowrap' }}>
            <SiVite size={14} color="#bd93f9" />
            Vite
          </div>
          {/* Stamp passes inside Vite */}
          <div className="flex flex-col gap-1.5">
            <FlowBox muted>
              <SiReact size={16} color="#61dafb" />
              Babel pass (JSX)
            </FlowBox>
            <FlowBox muted>
              <SiVuedotjs size={16} color="#4fc08d" />
              compiler-sfc (.vue)
            </FlowBox>
          </div>
        </div>

        <Arrow />

        {/* Output: the stamped attribute */}
        <AccentBox>
          <LuCodeXml size={16} />
          <code style={{ fontSize: 13 }}>data-spotnote="file:line:col"</code>
        </AccentBox>
      </div>
    </div>
  );
}

// ── The pick → note → copy loop ─────────────────────────────────────

interface Step {
  icon: ReactNode;
  label: string;
  detail: string;
}

const pickSteps: Step[] = [
  { icon: <LuScanSearch />, label: 'Inspect', detail: 'Hold Alt (or toggle Inspect) — elements highlight as you hover' },
  { icon: <LuMousePointerClick />, label: 'Click', detail: 'Reads the element’s data-spotnote, drops a pin, opens the note panel' },
  { icon: <LuMessageSquare />, label: 'Note', detail: 'Write an instruction for your coding agent' },
  { icon: <LuClipboardCopy />, label: 'Copy', detail: 'Clipboard gets an agent-ready prompt: exact file:line:col + element + computed styles' },
];

export function PickFlow() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border px-6 py-5">
      <div className="flex flex-col gap-5">
        {pickSteps.map((step, i) => (
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
