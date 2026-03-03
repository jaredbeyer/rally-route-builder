import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rally Route Builder',
  description: 'GPX/KML turn analyzer & mile marker tool for offroad racing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
