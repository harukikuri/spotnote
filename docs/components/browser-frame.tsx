import type { ReactNode } from 'react';

interface BrowserFrameProps {
  url?: string;
  children: ReactNode;
}

export function BrowserFrame({ url = 'localhost:5173', children }: BrowserFrameProps) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-fd-border shadow-sm">
      <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
          <div className="size-3 rounded-full bg-fd-muted-foreground/20" />
        </div>
        <div className="mx-2 flex-1 rounded-md bg-fd-background px-3 py-1 text-xs text-fd-muted-foreground">
          {url}
        </div>
      </div>
      <div className="bg-fd-background">
        {children}
      </div>
    </div>
  );
}
