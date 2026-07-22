import { RootProvider } from 'fumadocs-ui/provider/next';
import { Header } from '@/components/header';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Spotnote',
  description: 'Spot UI elements, create feedback with code context',
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
