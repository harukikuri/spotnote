'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const FULL_TEXT = 'Make this title bigger';

type Target = 'center' | 'interact-btn' | 'hero-title' | 'popup-input' | 'popup-add';

interface Step {
  target: Target;
  highlight: string | null;
  interactActive: boolean;
  popup: { text: string; addHighlight: boolean } | null;
  pin: boolean;
  toast: boolean;
}

// pick → note → Add → pin dropped → "copied ✓" — exactly what the plugin does.
const steps: Step[] = [
  // 0 — Idle
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, toast: false },
  // 1 — Move → interact button
  { target: 'interact-btn', highlight: null, interactActive: false, popup: null, pin: false, toast: false },
  // 2 — Click interact (inspect on)
  { target: 'interact-btn', highlight: null, interactActive: true, popup: null, pin: false, toast: false },
  // 3 — Hover the hero (dashed box + label pill)
  { target: 'hero-title', highlight: 'hero', interactActive: true, popup: null, pin: false, toast: false },
  // 4 — Click hero → pin + note panel
  { target: 'hero-title', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, toast: false },
  // 5 — Move → input
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, toast: false },
  // 6 — Typing
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: 'typing', addHighlight: false }, pin: true, toast: false },
  // 7 — Typed
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, toast: false },
  // 8 — Move → Add
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, toast: false },
  // 9 — Hover Add
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: true }, pin: true, toast: false },
  // 10 — Click Add → panel closes, pin stays, prompt copied
  { target: 'popup-add', highlight: null, interactActive: false, popup: null, pin: true, toast: true },
  // 11 — Pause on the result
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true, toast: true },
  // 12 — Reset
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, toast: false },
];

const durations = [1200, 600, 400, 700, 300, 600, 1200, 500, 600, 300, 500, 2000, 800];

// ── Sub-components ──────────────────────────────────────────────────

function NotePin({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-10 flex items-center justify-center" style={{ left: x, top: y, marginLeft: -11, marginTop: -11, width: 22, height: 22, borderRadius: '50%', background: '#6366f1', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', animation: 'fd-fade-in 0.15s ease' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <line x1="6" y1="10" x2="18" y2="10" /><line x1="6" y1="14" x2="18" y2="14" />
      </svg>
    </div>
  );
}

// The plugin's on-hover "tag (file:line)" badge.
function HoverLabel({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-20" style={{ left: x, top: y, display: 'flex', gap: 6, alignItems: 'center', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
      <span>h1</span>
      <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'ui-monospace, monospace', fontWeight: 400 }}>(Hero.tsx:12)</span>
    </div>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────

function useTypingText(step: number, typingStep: number): string {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (step !== typingStep) {
      setDisplayed(steps[step]?.popup?.text === FULL_TEXT ? FULL_TEXT : '');
      return;
    }
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => { i++; setDisplayed(FULL_TEXT.slice(0, i)); if (i >= FULL_TEXT.length) clearInterval(interval); }, 50);
    return () => clearInterval(interval);
  }, [step, typingStep]);
  return displayed;
}

// ── Main component ──────────────────────────────────────────────────

export function SpotnoteFullDemo() {
  const [step, setStep] = useState(0);
  const typingText = useTypingText(step, 6);

  const containerRef = useRef<HTMLDivElement>(null);
  const interactBtnRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [heroTitlePos, setHeroTitlePos] = useState({ x: 0, y: 0 });

  const getCenter = useCallback((el: HTMLElement | null): { x: number; y: number } => {
    const c = containerRef.current;
    if (!el || !c) return { x: c ? c.offsetWidth / 2 : 300, y: 150 };
    const cR = c.getBoundingClientRect(); const eR = el.getBoundingClientRect();
    return { x: eR.left - cR.left + eR.width / 2, y: eR.top - cR.top + eR.height / 2 };
  }, []);

  const getPopupInputPos = useCallback((): { x: number; y: number } => {
    const c = containerRef.current; const p = popupRef.current;
    if (!p || !c) return { x: 300, y: 150 };
    const cR = c.getBoundingClientRect(); const pR = p.getBoundingClientRect();
    return { x: pR.left - cR.left + pR.width / 2, y: pR.top - cR.top + 52 };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => (s + 1) % steps.length), durations[step]);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const s = steps[step]; const c = containerRef.current; if (!c) return;
    let pos: { x: number; y: number };
    switch (s.target) {
      case 'interact-btn': pos = getCenter(interactBtnRef.current); break;
      case 'hero-title': pos = getCenter(heroTitleRef.current); break;
      case 'popup-input': pos = getPopupInputPos(); break;
      case 'popup-add': pos = getCenter(addBtnRef.current); break;
      default: pos = { x: c.offsetWidth / 2, y: 150 };
    }
    setCursorPos(pos);
    if (s.target === 'hero-title') setHeroTitlePos(pos);
  }, [step, getCenter, getPopupInputPos]);

  const s = steps[step];
  const popupText = s.popup ? (s.popup.text === 'typing' ? typingText : s.popup.text) : '';
  const showPlaceholder = s.popup !== null && popupText === '';
  const addDisabled = s.popup !== null && popupText === '';
  const isHovering = s.highlight === 'hero' && s.interactActive; // dashed box + pill, pre-click

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-fd-border shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
        </div>
        <div className="mx-2 flex-1 rounded-md bg-fd-background px-3 py-1 text-xs text-fd-muted-foreground">
          localhost:5173
        </div>
      </div>

      {/* Content area */}
      <div ref={containerRef} className="relative select-none overflow-hidden bg-fd-background" style={{ height: 300 }}>
        {/* Mock page */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-md" style={{ background: '#6366f1' }} />
              <div className="h-3 w-16 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.12 }} />
            </div>
            <div className="flex gap-4">
              <div className="h-2.5 w-10 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.08 }} />
              <div className="h-2.5 w-10 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.08 }} />
              <div className="h-2.5 w-10 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.08 }} />
            </div>
          </div>
          <div className="rounded-lg px-5 py-5 mb-5 transition-all duration-300" style={{ outline: s.highlight === 'hero' ? `2px ${isHovering ? 'dashed' : 'solid'} #6366f1` : '2px solid transparent', background: s.highlight === 'hero' ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
            <div ref={heroTitleRef} className="h-5 w-52 rounded mb-2.5" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.12 }} />
            <div className="h-3 w-80 rounded mb-1.5" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
            <div className="h-3 w-64 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-24 rounded-md" style={{ background: '#6366f1', opacity: 0.15 }} />
              <div className="h-8 w-24 rounded-md" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg p-3" style={{ border: '1px solid var(--color-fd-border, #e5e5e5)' }}>
                <div className="size-7 rounded mb-2" style={{ background: '#6366f1', opacity: 0.08 }} />
                <div className="h-2.5 w-16 rounded mb-1.5" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.1 }} />
                <div className="h-2 w-full rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.05 }} />
                <div className="h-2 w-3/4 rounded mt-1" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.05 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="absolute flex flex-col items-center gap-0" style={{ bottom: 16, left: 16, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {/* Minimize — a "+" rotated 45° to read as "×" while open */}
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: 'rotate(45deg)' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <div style={{ width: 20, height: 1, background: '#444', margin: '4px 0' }} />
          <div ref={interactBtnRef} className="flex items-center justify-center transition-all duration-200" style={{ width: 32, height: 32, borderRadius: '50%', color: s.interactActive ? '#6366f1' : '#999', background: s.interactActive ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>
          </div>
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </div>
        </div>

        {/* Copied toast — the launcher's flash */}
        {s.toast && (
          <div className="absolute z-30" style={{ bottom: 132, left: 16, background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', animation: 'fd-fade-in 0.15s ease' }}>
          copied ✓
          </div>
        )}

        {/* Hover label pill */}
        {isHovering && <HoverLabel x={heroTitlePos.x - 104} y={heroTitlePos.y - 34} />}

        {/* Pin */}
        {s.pin && <NotePin x={heroTitlePos.x} y={heroTitlePos.y} />}

        {/* Note panel */}
        {s.popup && (
          <div ref={popupRef} className="absolute z-10" style={{ left: heroTitlePos.x - 20, top: heroTitlePos.y + 30, width: 300, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'fd-fade-in 0.18s ease' }}>
            {/* Header: element label + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 7px 7px 12px', borderBottom: '1px solid #262626' }}>
              <span style={{ color: '#ededed', fontWeight: 600, fontSize: 13 }}>h1</span>
              <span style={{ color: '#888', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>(Hero.tsx:12)</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, color: '#999' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            {/* Input */}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ color: showPlaceholder ? '#666' : '#ededed', fontSize: 13, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '18px', minHeight: 18 }}>
                {showPlaceholder ? 'Describe the change for the agent…' : popupText}
                {s.popup.text === 'typing' && <span style={{ display: 'inline-block', width: 1, height: 14, background: '#ededed', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'fd-blink 0.8s step-end infinite' }} />}
              </div>
            </div>
            {/* Footer: Cancel + Add */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: '1px solid #262626' }}>
              <div style={{ padding: '3px 9px', borderRadius: 6, background: 'none', color: '#888', fontSize: 12, display: 'flex', alignItems: 'center' }}>Cancel</div>
              <div ref={addBtnRef} style={{ padding: '3px 9px', borderRadius: 6, background: addDisabled ? '#4338ca44' : s.popup.addHighlight ? '#4f46e5' : '#6366f1', color: addDisabled ? '#ffffff66' : '#fff', fontSize: 12, display: 'flex', alignItems: 'center', transition: 'background 0.14s' }}>Add</div>
            </div>
          </div>
        )}

        {/* Cursor */}
        <div className="pointer-events-none absolute z-40 transition-all duration-500" style={{ left: cursorPos.x, top: cursorPos.y, transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path d="M1 1L1 14.5L4.5 11L8.5 19L11 18L7 10L12 10L1 1Z" fill="var(--color-fd-foreground, #000)" stroke="var(--color-fd-background, #fff)" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes fd-blink { 50% { opacity: 0; } }
        @keyframes fd-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
