// Excalidraw diagrams. Sources live in docs/diagrams/<name>.excalidraw;
// export them to public/diagrams/<name>.svg and <name>-dark.svg
// (Excalidraw's export dialog: SVG, background off, dark mode on for -dark).

export function Diagram({
  name,
  alt,
  width,
  height,
}: {
  name: string;
  alt: string;
  width: number;
  height: number;
}) {
  const img = (src: string, className: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={`m-0 w-full h-auto ${className}`} />
  );
  return (
    <figure className="not-prose my-6 rounded-xl border p-4">
      {img(`/diagrams/${name}.svg`, 'dark:hidden')}
      {img(`/diagrams/${name}-dark.svg`, 'hidden dark:block')}
    </figure>
  );
}
