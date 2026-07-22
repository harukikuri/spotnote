'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const FULL_TEXT = 'Make this title bigger';

const NOTE_CONTEXT = `Note: "Make this title bigger"
Source: src/components/Hero.tsx:12:4
Element: <h1 data-spotnote-id="f8c2a91d3e">`;

const AI_RESPONSE = `I'll update the hero title size in Hero.tsx.

  src/components/Hero.tsx
  - <h1 className="text-3xl font-bold">
  + <h1 className="text-5xl font-bold">`;

type Target =
  | 'center'
  | 'interact-btn'
  | 'hero-title'
  | 'popup-input'
  | 'popup-add'
  | 'pin-hover'
  | 'copy-btn'
  | 'terminal-center';

interface Step {
  target: Target;
  highlight: string | null;
  interactActive: boolean;
  popup: { text: string; addHighlight: boolean } | null;
  pin: boolean;
  expandedCard: boolean;
  copied: boolean;
  floatingWindow: boolean;
  terminalState: 'idle' | 'paste' | 'typing-ai' | 'done';
}

// Each step is either a "move" (cursor travels) or an "act" (cursor stays, action fires).
const steps: Step[] = [
  //  0 — Idle
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  1 — Move → interact button
  { target: 'interact-btn', highlight: null, interactActive: false, popup: null, pin: false, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  2 — Act: click interact
  { target: 'interact-btn', highlight: null, interactActive: true, popup: null, pin: false, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  3 — Move → hero title
  { target: 'hero-title', highlight: 'hero', interactActive: true, popup: null, pin: false, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  4 — Act: click hero → pin + popup
  { target: 'hero-title', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  5 — Move → popup input
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  6 — Act: typing
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: 'typing', addHighlight: false }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  7 — Act: typing done
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  8 — Move → Add button
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  //  9 — Act: hover Add
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: true }, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  // 10 — Act: click Add → save
  { target: 'popup-add', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  // 11 — Move → pin
  { target: 'pin-hover', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
  // 12 — Act: expanded card appears
  { target: 'pin-hover', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: true, copied: false, floatingWindow: false, terminalState: 'idle' },
  // 13 — Move → copy button
  { target: 'copy-btn', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: true, copied: false, floatingWindow: false, terminalState: 'idle' },
  // 14 — Act: click copy
  { target: 'copy-btn', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: true, copied: true, floatingWindow: false, terminalState: 'idle' },
  // 15 — Act: floating window appears, card closes
  { target: 'terminal-center', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: true, terminalState: 'paste' },
  // 16 — Act: AI typing
  { target: 'terminal-center', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: true, terminalState: 'typing-ai' },
  // 17 — Act: AI done
  { target: 'terminal-center', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: true, terminalState: 'done' },
  // 18 — Pause to read
  { target: 'terminal-center', highlight: null, interactActive: false, popup: null, pin: true, expandedCard: false, copied: false, floatingWindow: true, terminalState: 'done' },
  // 19 — Reset
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false, expandedCard: false, copied: false, floatingWindow: false, terminalState: 'idle' },
];

const durations = [
  1200,  //  0  idle
  600,   //  1  move → interact btn
  400,   //  2  act: click interact
  700,   //  3  move → hero title
  300,   //  4  act: click hero
  600,   //  5  move → popup input
  1200,  //  6  act: typing
  500,   //  7  act: typing done
  600,   //  8  move → Add btn
  300,   //  9  act: hover Add
  400,   // 10  act: click Add
  600,   // 11  move → pin
  800,   // 12  act: expanded card
  600,   // 13  move → copy btn
  800,   // 14  act: click copy
  800,   // 15  act: floating window + paste
  2400,  // 16  act: AI typing
  400,   // 17  act: AI done
  2000,  // 18  pause
  800,   // 19  reset
];

// ── Sub-components ──────────────────────────────────────────────────

function ChatBubblePin({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-10" style={{ left: x, top: y, marginLeft: -14, marginTop: -14, width: 28, height: 28, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', animation: 'fd-fade-in 0.15s ease' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#6366f1" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="11.5" r="1" fill="#fff" /><circle cx="8" cy="11.5" r="1" fill="#fff" /><circle cx="16" cy="11.5" r="1" fill="#fff" />
      </svg>
    </div>
  );
}

function IconBtn({ children, active, variant, btnRef }: { children: React.ReactNode; active?: boolean; variant?: 'danger'; btnRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={btnRef} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#22c55e' : variant === 'danger' ? '#ef4444' : '#999', background: active ? 'rgba(34,197,94,0.1)' : 'transparent', transition: 'background 0.14s, color 0.14s', flexShrink: 0 }}>
      {children}
    </div>
  );
}

function ExpandedCard({ x, y, copied, copyBtnRef }: { x: number; y: number; copied: boolean; copyBtnRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="absolute z-10" style={{ left: x, top: y + 20, minWidth: 200, maxWidth: 320, width: 'max-content', background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '10px 12px', fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif', animation: 'fd-slide-up 0.18s ease' }}>
      <div style={{ color: '#ededed', fontSize: 13, lineHeight: '18px', wordBreak: 'break-word', marginBottom: 8 }}>{FULL_TEXT}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
        <IconBtn><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg></IconBtn>
        <IconBtn active={copied} btnRef={copyBtnRef}>
          {copied
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
        </IconBtn>
        <IconBtn variant="danger"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg></IconBtn>
      </div>
    </div>
  );
}

function FloatingTerminal({ noteText, aiText, terminalRef }: { noteText: string; aiText: string; terminalRef: React.RefObject<HTMLDivElement | null> }) {
  const aiLines = aiText.split('\n');
  const firstLine = aiLines[0] || '';
  const diffLines = aiLines.slice(1);
  const isTyping = aiText.length > 0 && aiText.length < AI_RESPONSE.length;

  return (
    <div
      className="absolute z-30"
      style={{
        right: 16,
        bottom: 16,
        width: '65%',
        maxWidth: 420,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        border: '1px solid #30363d',
        animation: 'fd-slide-up 0.25s ease',
      }}
    >
      {/* Title bar */}
      <div style={{ background: '#161b22', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #21262d' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f85149' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d29922' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3fb950' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: '#8b949e', fontSize: 10, fontWeight: 500, fontFamily: 'ui-monospace, monospace' }}>
          ~/projects/my-app — claude
        </div>
      </div>
      {/* Terminal body */}
      <div ref={terminalRef} style={{ background: '#0d1117', padding: '10px 14px', minHeight: 120, fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace', fontSize: 10, lineHeight: '16px' }}>
        {/* Path + prompt */}
        <div style={{ color: '#484f58', marginBottom: 6 }}>
          <span style={{ color: '#6366f1' }}>{'❯ '}</span>
          <span style={{ color: '#8b949e' }}>Paste from Spotnote</span>
        </div>
        {/* Pasted note as user message */}
        {noteText && (
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '8px 10px', marginBottom: 8, color: '#c9d1d9', whiteSpace: 'pre-wrap', fontSize: 10, lineHeight: '15px' }}>
            {noteText}
          </div>
        )}
        {/* Claude response */}
        {firstLine && (
          <div>
            {/* Response header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ color: '#d2a8ff', fontSize: 10 }}>{'✻'}</span>
              <span style={{ color: '#d2a8ff', fontSize: 10, fontWeight: 600 }}>Claude</span>
            </div>
            {/* Response text */}
            <div style={{ color: '#c9d1d9', marginBottom: diffLines.length > 0 ? 6 : 0 }}>
              {firstLine}
              {isTyping && diffLines.length === 0 && (
                <span style={{ display: 'inline-block', width: 5, height: 12, background: '#c9d1d9', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'fd-blink 0.6s step-end infinite' }} />
              )}
            </div>
            {/* Diff block */}
            {diffLines.length > 0 && diffLines.some((l) => l.trim()) && (
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '6px 8px', fontSize: 10, lineHeight: '15px' }}>
                {diffLines.map((line, i) => {
                  const trimmed = line.replace(/^  /, '');
                  const isAdd = trimmed.startsWith('+ ');
                  const isDel = trimmed.startsWith('- ');
                  const isFile = trimmed.startsWith('src/');
                  return (
                    <div
                      key={i}
                      style={{
                        color: isAdd ? '#3fb950' : isDel ? '#f85149' : isFile ? '#8b949e' : '#c9d1d9',
                        background: isAdd ? 'rgba(63,185,80,0.08)' : isDel ? 'rgba(248,81,73,0.08)' : 'transparent',
                        padding: isAdd || isDel ? '0 4px' : undefined,
                        borderRadius: 2,
                        whiteSpace: 'pre',
                      }}
                    >
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
        {/* Empty state */}
        {!noteText && !aiText && (
          <div style={{ color: '#484f58' }}>
            <span style={{ color: '#6366f1' }}>{'❯ '}</span>
            <span style={{ animation: 'fd-blink 1s step-end infinite' }}>_</span>
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
    if (!s || s.terminalState === 'idle') { setNoteText(''); setAiText(''); return; }
    if (step === pasteStep) {
      setNoteText(''); setAiText('');
      let i = 0;
      const interval = setInterval(() => { i += 2; setNoteText(NOTE_CONTEXT.slice(0, i)); if (i >= NOTE_CONTEXT.length) clearInterval(interval); }, 15);
      return () => clearInterval(interval);
    }
    if (step >= pasteStep) setNoteText(NOTE_CONTEXT);
    if (step === aiStep) {
      setAiText('');
      let i = 0;
      const interval = setInterval(() => { i++; setAiText(AI_RESPONSE.slice(0, i)); if (i >= AI_RESPONSE.length) clearInterval(interval); }, 30);
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
  const { noteText, aiText } = useTerminalTyping(step, 15, 16);

  const containerRef = useRef<HTMLDivElement>(null);
  const interactBtnRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLDivElement>(null);
  const copyBtnRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

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
    return { x: pR.left - cR.left + pR.width / 2, y: pR.top - cR.top + 20 };
  }, []);

  const getTerminalCenter = useCallback((): { x: number; y: number } => {
    const c = containerRef.current; const t = terminalRef.current;
    if (!t || !c) return { x: c ? c.offsetWidth * 0.65 : 400, y: 200 };
    const cR = c.getBoundingClientRect(); const tR = t.getBoundingClientRect();
    return { x: tR.left - cR.left + tR.width / 2, y: tR.top - cR.top + tR.height / 2 };
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
      case 'pin-hover': pos = { x: heroTitlePos.x + 20, y: heroTitlePos.y }; break;
      case 'copy-btn': pos = getCenter(copyBtnRef.current); break;
      case 'terminal-center': pos = getTerminalCenter(); break;
      default: pos = { x: c.offsetWidth / 2, y: 150 };
    }
    setCursorPos(pos);
    if (s.target === 'hero-title') setHeroTitlePos(pos);
  }, [step, getCenter, getPopupInputPos, getTerminalCenter, heroTitlePos.x, heroTitlePos.y]);

  const s = steps[step];
  const popupText = s.popup ? (s.popup.text === 'typing' ? typingText : s.popup.text) : '';
  const showPlaceholder = s.popup !== null && popupText === '';
  const addDisabled = s.popup !== null && popupText === '';

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
          your-app.staging.com
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
          <div className="rounded-lg px-5 py-5 mb-5 transition-all duration-300" style={{ outline: s.highlight === 'hero' ? '2px solid #6366f1' : '2px solid transparent', background: s.highlight === 'hero' ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
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
        <div className="absolute flex flex-col items-center gap-0" style={{ top: 16, left: 16, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div style={{ width: 20, height: 1, background: '#444', margin: '4px 0' }} />
          <div ref={interactBtnRef} className="flex items-center justify-center transition-all duration-200" style={{ width: 32, height: 32, borderRadius: '50%', color: s.interactActive ? '#6366f1' : '#999', background: s.interactActive ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>
          </div>
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </div>
        </div>

        {/* Pin */}
        {s.pin && <ChatBubblePin x={heroTitlePos.x} y={heroTitlePos.y} />}

        {/* Expanded card */}
        {s.expandedCard && <ExpandedCard x={heroTitlePos.x} y={heroTitlePos.y} copied={s.copied} copyBtnRef={copyBtnRef} />}

        {/* Note popup */}
        {s.popup && (
          <div ref={popupRef} className="absolute z-10" style={{ left: heroTitlePos.x - 20, top: heroTitlePos.y + 30, width: 240, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '10px 12px', animation: 'fd-fade-in 0.18s ease' }}>
            <div style={{ color: showPlaceholder ? '#666' : '#ededed', fontSize: 13, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '18px', minHeight: 18 }}>
              {showPlaceholder ? 'Add feedback...' : popupText}
              {s.popup.text === 'typing' && <span style={{ display: 'inline-block', width: 1, height: 14, background: '#ededed', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'fd-blink 0.8s step-end infinite' }} />}
            </div>
            <div className="flex justify-end mt-2 gap-1.5">
              <div style={{ height: 26, padding: '0 10px', borderRadius: 6, background: '#333', color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', fontWeight: 500 }}>Cancel</div>
              <div ref={addBtnRef} style={{ height: 26, padding: '0 10px', borderRadius: 6, background: addDisabled ? '#4338ca44' : s.popup.addHighlight ? '#4f46e5' : '#6366f1', color: addDisabled ? '#ffffff66' : '#fff', fontSize: 11, display: 'flex', alignItems: 'center', fontWeight: 500, transition: 'background 0.14s' }}>Add</div>
            </div>
          </div>
        )}

        {/* Floating Claude Code window */}
        {s.floatingWindow && (
          <FloatingTerminal noteText={noteText} aiText={aiText} terminalRef={terminalRef} />
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
        @keyframes fd-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
