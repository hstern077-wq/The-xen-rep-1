import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Creative Spine',
  description: 'Creative production OS for AI-assisted video creators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
