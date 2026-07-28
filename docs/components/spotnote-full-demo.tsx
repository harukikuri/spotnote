'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const FULL_TEXT = 'Make this title bigger';

// What the plugin actually copies to the clipboard (buildPrompt output).
const NOTE_CONTEXT = `Edit the source for the UI element below to apply the request.

## Request
Make this title bigger

## Target
- file: src/components/Hero.tsx
- line: 12, column: 4
- element: <h1 class="text-3xl font-bold">`;

const AI_RESPONSE = `I'll bump the hero title size in Hero.tsx.

  src/components/Hero.tsx
  - <h1 className="text-3xl font-bold">
  + <h1 className="text-5xl font-bold">`;

type Target = 'center' | 'interact-btn' | 'hero-title' | 'popup-input' | 'popup-add';
type Terminal = 'idle' | 'paste' | 'typing-ai' | 'done';

interface Step {
  target: Target;
  highlight: string | null;
  interactActive: boolean;
  popup: { text: string; addHighlight: boolean } | null;
  pin: boolean;
  toast: boolean;
  terminal: Terminal;
}

// pick → note → Add (copies prompt) → paste into your coding agent.
const steps: Step[] = [
  // 0 — Idle
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, toast: false, terminal: 'idle' },
  // 1 — Move → interact button
  { target: 'interact-btn', highlight: null, interactActive: false, popup: null, pin: false, toast: false, terminal: 'idle' },
  // 2 — Click interact (inspect on)
  { target: 'interact-btn', highlight: null, interactActive: true, popup: null, pin: false, toast: false, terminal: 'idle' },
  // 3 — Hover the hero (dashed box + label pill)
  { target: 'hero-title', highlight: 'hero', interactActive: true, popup: null, pin: false, toast: false, terminal: 'idle' },
  // 4 — Click hero → pin + note panel
  { target: 'hero-title', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, toast: false, terminal: 'idle' },
  // 5 — Move → input
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, toast: false, terminal: 'idle' },
  // 6 — Typing
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: 'typing', addHighlight: false }, pin: true, toast: false, terminal: 'idle' },
  // 7 — Typed
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, toast: false, terminal: 'idle' },
  // 8 — Move → Add
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, toast: false, terminal: 'idle' },
  // 9 — Hover Add
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: true }, pin: true, toast: false, terminal: 'idle' },
  // 10 — Click Add → panel closes, pin stays, prompt copied
  { target: 'popup-add', highlight: null, interactActive: false, popup: null, pin: true, toast: true, terminal: 'idle' },
  // 11 — Paste the prompt into the agent
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true, toast: false, terminal: 'paste' },
  // 12 — Agent responds
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true, toast: false, terminal: 'typing-ai' },
  // 13 — Done
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true, toast: false, terminal: 'done' },
  // 14 — Pause on the result
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true, toast: false, terminal: 'done' },
  // 15 — Reset
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, toast: false, terminal: 'idle' },
];

const durations = [1200, 600, 400, 700, 300, 600, 1200, 500, 600, 300, 700, 900, 2400, 400, 2200, 800];

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

function FloatingTerminal({ noteText, aiText }: { noteText: string; aiText: string }) {
  const aiLines = aiText.split('\n');
  const firstLine = aiLines[0] || '';
  const diffLines = aiLines.slice(1);
  const isTyping = aiText.length > 0 && aiText.length < AI_RESPONSE.length;

  return (
    <div className="absolute z-30" style={{ right: 12, bottom: -12, width: '65%', maxWidth: 420, borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', border: '1px solid #30363d', animation: 'fd-slide-up 0.25s ease' }}>
      {/* Title bar */}
      <div style={{ background: '#161b22', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #21262d' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f85149' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d29922' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3fb950' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: '#8b949e', fontSize: 10, fontWeight: 500, fontFamily: 'ui-monospace, monospace' }}>~/projects/my-app — claude</div>
      </div>
      {/* Body */}
      <div style={{ background: '#0d1117', padding: '10px 14px', minHeight: 120, fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace', fontSize: 10, lineHeight: '16px' }}>
        <div style={{ color: '#484f58', marginBottom: 6 }}>
          <span style={{ color: '#6366f1' }}>{'❯ '}</span>
          <span style={{ color: '#8b949e' }}>Pasted from Spotnote</span>
        </div>
        {noteText && (
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '8px 10px', marginBottom: 8, color: '#c9d1d9', whiteSpace: 'pre-wrap', fontSize: 10, lineHeight: '15px' }}>{noteText}</div>
        )}
        {firstLine && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ color: '#d2a8ff', fontSize: 10 }}>{'✻'}</span>
              <span style={{ color: '#d2a8ff', fontSize: 10, fontWeight: 600 }}>Claude</span>
            </div>
            <div style={{ color: '#c9d1d9', marginBottom: diffLines.length > 0 ? 6 : 0 }}>
              {firstLine}
              {isTyping && diffLines.length === 0 && (
                <span style={{ display: 'inline-block', width: 5, height: 12, background: '#c9d1d9', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'fd-blink 0.6s step-end infinite' }} />
              )}
            </div>
            {diffLines.length > 0 && diffLines.some((l) => l.trim()) && (
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '6px 8px', fontSize: 10, lineHeight: '15px' }}>
                {diffLines.map((line, i) => {
                  const trimmed = line.replace(/^  /, '');
                  const isAdd = trimmed.startsWith('+ ');
                  const isDel = trimmed.startsWith('- ');
                  const isFile = trimmed.startsWith('src/');
                  return (
                    <div key={i} style={{ color: isAdd ? '#3fb950' : isDel ? '#f85149' : isFile ? '#8b949e' : '#c9d1d9', background: isAdd ? 'rgba(63,185,80,0.08)' : isDel ? 'rgba(248,81,73,0.08)' : 'transparent', padding: isAdd || isDel ? '0 4px' : undefined, borderRadius: 2, whiteSpace: 'pre' }}>
                      {trimmed}
                      {isTyping && i === diffLines.length - 1 && (
                        <span style={{ display: 'inline-block', width: 5, height: 12, background: isAdd ? '#3fb950' : '#c9d1d9', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'fd-blink 0.6s step-end infinite' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
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

function useTerminalTyping(step: number, pasteStep: number, aiStep: number): { noteText: string; aiText: string } {
  const [noteText, setNoteText] = useState('');
  const [aiText, setAiText] = useState('');
  useEffect(() => {
    const s = steps[step];
    if (!s || s.terminal === 'idle') { setNoteText(''); setAiText(''); return; }
    if (step === pasteStep) {
      setNoteText(''); setAiText('');
      let i = 0;
      const interval = setInterval(() => { i += 3; setNoteText(NOTE_CONTEXT.slice(0, i)); if (i >= NOTE_CONTEXT.length) clearInterval(interval); }, 12);
      return () => clearInterval(interval);
    }
    if (step >= pasteStep) setNoteText(NOTE_CONTEXT);
    if (step === aiStep) {
      setAiText('');
      let i = 0;
      const interval = setInterval(() => { i++; setAiText(AI_RESPONSE.slice(0, i)); if (i >= AI_RESPONSE.length) clearInterval(interval); }, 25);
      return () => clearInterval(interval);
    }
    if (step > aiStep) setAiText(AI_RESPONSE);
  }, [step, pasteStep, aiStep]);
  return { noteText, aiText };
}

// ── Main component ──────────────────────────────────────────────────

export function SpotnoteFullDemo() {
  const [step, setStep] = useState(0);
  const typingText = useTypingText(step, 6);
  const { noteText, aiText } = useTerminalTyping(step, 11, 12);

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
    <div className="my-6 relative pt-14">
      <div className="overflow-hidden rounded-lg border border-fd-border shadow-sm">
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
          <div className="absolute z-30" style={{ bottom: 132, left: 16, background: '#6366f1', color: '#fff', fontSize: 12, lineHeight: 'normal', whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', animation: 'fd-fade-in 0.15s ease' }}>
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
              <div style={{ padding: '5px 12px', borderRadius: 6, background: 'none', color: '#888', fontSize: 13, lineHeight: 'normal', display: 'flex', alignItems: 'center' }}>Cancel</div>
              <div ref={addBtnRef} style={{ padding: '5px 12px', borderRadius: 6, background: addDisabled ? '#4338ca44' : s.popup.addHighlight ? '#4f46e5' : '#6366f1', color: addDisabled ? '#ffffff66' : '#fff', fontSize: 13, lineHeight: 'normal', display: 'flex', alignItems: 'center', transition: 'background 0.14s' }}>Add</div>
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
      </div>

      {/* Coding-agent terminal — floats low over the browser, clear of the doc text */}
      {s.terminal !== 'idle' && <FloatingTerminal noteText={noteText} aiText={aiText} />}

      <style>{`
        @keyframes fd-blink { 50% { opacity: 0; } }
        @keyframes fd-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fd-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
