import { RootProvider } from 'fumadocs-ui/provider/next';
import { Header } from '@/components/header';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Spotnote',
  description:
    'Dev-only Vite plugin — click a UI element and copy its exact source location for your coding agent.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ options: { type: 'static' } }}>
          <Header />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
