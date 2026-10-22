import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './player.css';
import './player-polish.css';
export const metadata: Metadata = { title: 'Clanker Radio · Live Performance', description: 'A 24-voice ensemble, Codex composer competitions, and live 3D visuals.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
