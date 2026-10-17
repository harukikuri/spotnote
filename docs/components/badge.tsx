'use client';

// A status badge from another site (GitHub Actions, Codecov). Until its image
// arrives, a grey bar of about its size stands in, so the badge doesn't pop in
// and nothing below it moves. If the image can't load, its alt text is shown
// as a plain link instead.
import { useEffect, useRef, useState } from 'react';

export function Badge({ href, src, alt, width }: { href: string; src: string; alt: string; width: number }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const img = useRef<HTMLImageElement>(null);
  // The image may have loaded (or failed) before React hydrated and could hear it.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth ? 'loaded' : 'failed');
  }, []);

  if (state === 'failed')
    return (
      <a href={href} className="inline-flex h-5 items-center text-xs text-fd-muted-foreground underline">
        {alt}
      </a>
    );
  return (
    <a href={href} className="relative inline-flex h-5">
      {state === 'loading' && <span className="h-5 animate-pulse rounded bg-fd-muted" style={{ width }} />}
      <img
        ref={img}
        src={src}
        alt={alt}
        height={20}
        className={`h-5 transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'absolute opacity-0'}`}
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
      />
    </a>
  );
}
