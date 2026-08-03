import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeetaDiwa · Sanskrit Shloka AI Avatar',
  description:
    'Offline Sanskrit Shloka translator with synchronized speech — English, Hindi & Tamil.',
  applicationName: 'GeetaDiwa',
};

export const viewport: Viewport = {
  themeColor: '#0b0a1f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
