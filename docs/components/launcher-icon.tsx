// The closed launcher, sized to sit inline in a sentence. Mirrors the client's
// `.snl-core` in the theme that matches the docs: glass circle, the yellow
// Spotnote mark (plugin/src/client/launcher.js ICON.mark, ui.js THEMES).
export function LauncherIcon() {
  return (
    <span
      role="img"
      aria-label="Spotnote launcher"
      className={
        'mx-0.5 inline-grid size-[1.75em] place-items-center rounded-full border align-middle ' +
        'border-black/[.08] bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_2px_6px_rgba(0,0,0,.15)] ' +
        'dark:border-white/10 dark:bg-[rgba(24,24,28,.92)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_2px_6px_rgba(0,0,0,.25)]'
      }
    >
      <svg width="0.8em" height="0.8em" viewBox="56 56 188 188" aria-hidden="true">
        <path
          fill="#FFD84D"
          fillRule="evenodd"
          d="M56 56h188v124l-64 64H56z M150 124a26 26 0 1 0-52 0a26 26 0 1 0 52 0z"
        />
        <path fill="#D4A817" d="M244 180h-64v64z" />
      </svg>
    </span>
  );
}
