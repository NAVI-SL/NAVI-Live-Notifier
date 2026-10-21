import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PROJECT_NAME } from '@navi/core';
import './globals.css';

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: 'Local development workspace for NAVI Live Notifier.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="policy-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </footer>
      </body>
    </html>
  );
}
