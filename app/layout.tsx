import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIBA House Cup',
  description: 'A shared house leaderboard for the LIBA Generative AI workshop.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
