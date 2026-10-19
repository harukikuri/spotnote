// A demo video: plays on its own, muted, in a loop, with a caption under it if
// given (children), and the button at the top right that shows it full size
// (see zoom.tsx).

import type { ReactNode } from 'react';
import { Zoom } from './zoom';

export function Video({ src, label, children }: { src: string; label: string; children?: ReactNode }) {
  const video = (className: string) => (
    <video src={src} aria-label={label} autoPlay muted loop playsInline className={`m-0 ${className}`} />
  );
  return (
    <figure className="my-6">
      <Zoom label={label} full={video('block max-h-[85vh] w-[min(92vw,1400px)] rounded-lg')}>
        {video('w-full rounded-lg border border-fd-border shadow-sm')}
      </Zoom>
      {children && (
        <figcaption className="mt-3 border-l-4 border-fd-border pl-4 text-sm italic text-fd-muted-foreground">
          {children}
        </figcaption>
      )}
    </figure>
  );
}
