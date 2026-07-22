'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const FULL_TEXT = 'Make this title bigger';

type Target =
  | 'center'
  | 'interact-btn'
  | 'hero-title'
  | 'popup-input'
  | 'popup-add';

interface Step {
  target: Target;
  highlight: string | null;
  interactActive: boolean;
  popup: { text: string; addHighlight: boolean } | null;
  pin: boolean;
}

const steps: Step[] = [
  // 0 — Idle
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false },
  // 1 — Move cursor to interact button
  { target: 'interact-btn', highlight: null, interactActive: false, popup: null, pin: false },
  // 2 — Click interact button (activates)
  { target: 'interact-btn', highlight: null, interactActive: true, popup: null, pin: false },
  // 3 — Move cursor to hero title
  { target: 'hero-title', highlight: 'hero', interactActive: true, popup: null, pin: false },
  // 4 — Click hero → pin + popup appear (empty input)
  { target: 'hero-title', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true },
  // 5 — Move cursor to input area
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: '', addHighlight: false }, pin: true },
  // 6 — Typing in progress
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: 'typing', addHighlight: false }, pin: true },
  // 7 — Typing complete
  { target: 'popup-input', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: false }, pin: true },
  // 8 — Move cursor to Add button
  { target: 'popup-add', highlight: 'hero', interactActive: false, popup: { text: FULL_TEXT, addHighlight: true }, pin: true },
  // 9 — Click Add → popup closes, pin stays
  { target: 'popup-add', highlight: null, interactActive: false, popup: null, pin: true },
  // 10 — Pause with pin visible
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: true },
  // 11 — Reset
  { target: 'center', highlight: null, interactActive: false, popup: null, pin: false },
];

const durations = [1200, 500, 400, 700, 300, 400, 1200, 400, 600, 500, 1400, 800];

function ChatBubblePin({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute z-10"
      style={{
        left: x,
        top: y,
        marginLeft: -14,
        marginTop: -14,
        width: 28,
        height: 28,
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
        animation: 'fd-fade-in 0.15s ease',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          fill="#6366f1"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="1" fill="#fff" />
        <circle cx="8" cy="11.5" r="1" fill="#fff" />
        <circle cx="16" cy="11.5" r="1" fill="#fff" />
      </svg>
    </div>
  );
}

function useTypingText(step: number): string {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (step !== 6) {
      if (step === 7 || step === 8 || step === 9) {
        setDisplayed(FULL_TEXT);
      } else {
        setDisplayed('');
      }
      return;
    }

    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [step]);

  return displayed;
}

export function SpotnoteDemo() {
  const [step, setStep] = useState(0);
  const typingText = useTypingText(step);

  const containerRef = useRef<HTMLDivElement>(null);
  const interactBtnRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [heroTitlePos, setHeroTitlePos] = useState({ x: 0, y: 0 });

  const getCenter = useCallback(
    (el: HTMLElement | null): { x: number; y: number } => {
      const container = containerRef.current;
      if (!el || !container) return { x: container ? container.offsetWidth / 2 : 300, y: 150 };
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      return {
        x: eRect.left - cRect.left + eRect.width / 2,
        y: eRect.top - cRect.top + eRect.height / 2,
      };
    },
    [],
  );

  const getPopupInputPos = useCallback((): { x: number; y: number } => {
    const container = containerRef.current;
    const popup = popupRef.current;
    if (!popup || !container) return { x: 300, y: 150 };
    const cRect = container.getBoundingClientRect();
    const pRect = popup.getBoundingClientRect();
    return {
      x: pRect.left - cRect.left + pRect.width / 2,
      y: pRect.top - cRect.top + 20,
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep((s) => (s + 1) % steps.length);
    }, durations[step]);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const s = steps[step];
    const container = containerRef.current;
    if (!container) return;

    let pos: { x: number; y: number };
    switch (s.target) {
      case 'interact-btn':
        pos = getCenter(interactBtnRef.current);
        break;
      case 'hero-title':
        pos = getCenter(heroTitleRef.current);
        break;
      case 'popup-input':
        pos = getPopupInputPos();
        break;
      case 'popup-add':
        pos = getCenter(addBtnRef.current);
        break;
      default:
        pos = { x: container.offsetWidth / 2, y: 150 };
    }
    setCursorPos(pos);

    if (s.target === 'hero-title') {
      setHeroTitlePos(pos);
    }
  }, [step, getCenter, getPopupInputPos]);

  const s = steps[step];
  const popupText = s.popup ? (s.popup.text === 'typing' ? typingText : s.popup.text) : '';
  const showPlaceholder = s.popup !== null && popupText === '';
  const addDisabled = s.popup !== null && popupText === '';

  return (
    <div ref={containerRef} className="relative select-none overflow-hidden" style={{ height: 300 }}>
      {/* ── Mock page content ── */}
      <div className="px-8 py-6">
        {/* Nav bar */}
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

        {/* Hero section */}
        <div
          className="rounded-lg px-5 py-5 mb-5 transition-all duration-300"
          style={{
            outline: s.highlight === 'hero' ? '2px solid #6366f1' : '2px solid transparent',
            background: s.highlight === 'hero' ? 'rgba(99,102,241,0.04)' : 'transparent',
          }}
        >
          <div ref={heroTitleRef} className="h-5 w-52 rounded mb-2.5" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.12 }} />
          <div className="h-3 w-80 rounded mb-1.5" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
          <div className="h-3 w-64 rounded" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 rounded-md" style={{ background: '#6366f1', opacity: 0.15 }} />
            <div className="h-8 w-24 rounded-md" style={{ background: 'var(--color-fd-foreground, #333)', opacity: 0.06 }} />
          </div>
        </div>

        {/* Cards row */}
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

      {/* ── Spotnote toolbar ── */}
      <div
        className="absolute flex flex-col items-center gap-0"
        style={{
          top: 16,
          left: 16,
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 10,
          padding: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Toggle (X) button */}
        <div
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div style={{ width: 20, height: 1, background: '#444', margin: '4px 0' }} />
        {/* Interact button */}
        <div
          ref={interactBtnRef}
          className="flex items-center justify-center transition-all duration-200"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            color: s.interactActive ? '#6366f1' : '#999',
            background: s.interactActive ? 'rgba(99,102,241,0.08)' : 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </div>
        {/* List button */}
        <div
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: '50%', color: '#999' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
      </div>

      {/* ── Chat bubble pin ── */}
      {s.pin && <ChatBubblePin x={heroTitlePos.x} y={heroTitlePos.y} />}

      {/* ── Note popup ── */}
      {s.popup && (
        <div
          ref={popupRef}
          className="absolute z-10"
          style={{
            left: heroTitlePos.x - 20,
            top: heroTitlePos.y + 30,
            width: 240,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: '10px 12px',
            animation: 'fd-fade-in 0.18s ease',
          }}
        >
          <div
            style={{
              color: showPlaceholder ? '#666' : '#ededed',
              fontSize: 13,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '18px',
              minHeight: 18,
            }}
          >
            {showPlaceholder ? 'Add feedback...' : popupText}
            {s.popup.text === 'typing' && (
              <span
                style={{
                  display: 'inline-block',
                  width: 1,
                  height: 14,
                  background: '#ededed',
                  marginLeft: 1,
                  verticalAlign: 'text-bottom',
                  animation: 'fd-blink 0.8s step-end infinite',
                }}
              />
            )}
          </div>
          <div className="flex justify-end mt-2 gap-1.5">
            <div
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 6,
                background: '#333',
                color: '#999',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500,
              }}
            >
              Cancel
            </div>
            <div
              ref={addBtnRef}
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 6,
                background: addDisabled ? '#4338ca44' : s.popup.addHighlight ? '#4f46e5' : '#6366f1',
                color: addDisabled ? '#ffffff66' : '#fff',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500,
                transition: 'background 0.14s',
              }}
            >
              Add
            </div>
          </div>
        </div>
      )}

      {/* ── Cursor ── */}
      <div
        className="pointer-events-none absolute z-20 transition-all duration-500"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
          <path
            d="M1 1L1 14.5L4.5 11L8.5 19L11 18L7 10L12 10L1 1Z"
            fill="var(--color-fd-foreground, #000)"
            stroke="var(--color-fd-background, #fff)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <style>{`
        @keyframes fd-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
