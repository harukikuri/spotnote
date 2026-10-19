// Excalidraw diagrams. Sources live in docs/diagrams/<name>.excalidraw;
// export them to public/diagrams/<name>.svg and <name>-dark.svg
// (Excalidraw's export dialog: SVG, background off, dark mode on for -dark).
// The button at the top right shows the diagram full size (see zoom.tsx).

import { Zoom } from './zoom';

export function Diagram({ name, alt, width, height }: { name: string; alt: string; width: number; height: number }) {
  const img = (src: string, className: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={`m-0 h-auto ${className}`} />
  );
  const both = (className: string) => (
    <>
      {img(`/diagrams/${name}.svg`, `dark:hidden ${className}`)}
      {img(`/diagrams/${name}-dark.svg`, `hidden dark:block ${className}`)}
    </>
  );
  return (
    <Zoom
      label={alt}
      full={both('max-h-[85vh] w-[min(92vw,1400px)] object-contain')}
      className="not-prose my-6 rounded-xl border p-4"
    >
      {both('w-full')}
    </Zoom>
  );
}
