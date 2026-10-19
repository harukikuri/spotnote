// App icons for the switcher: plain shapes, not any real app's icon.
const ICONS = {
  Browser: {
    bg: "linear-gradient(160deg, #5ac8fa, #007aff)",
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3">
        <circle cx="32" cy="32" r="18" />
        <ellipse cx="32" cy="32" rx="8" ry="18" />
        <path d="M14 32h36" />
      </g>
    ),
  },
  Chat: {
    bg: "linear-gradient(160deg, #7b3f86, #4a154b)",
    glyph: <path d="M16 20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H28l-9 8v-8h-3z" fill="#fff" />,
  },
  Terminal: {
    bg: "linear-gradient(160deg, #3a3a3c, #1c1c1e)",
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 24l8 8-8 8" />
        <path d="M30 42h14" />
      </g>
    ),
  },
};

export function AppIcon({ app, size }) {
  const i = ICONS[app];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <foreignObject x="2" y="2" width="60" height="60">
        <div style={{ width: 60, height: 60, borderRadius: 14, background: i.bg }} />
      </foreignObject>
      {i.glyph}
    </svg>
  );
}
