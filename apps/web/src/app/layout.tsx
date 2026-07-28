import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Smart Hospital & Research Center',
  description: 'Hospital Management System — Admin Dashboard',
};

/**
 * Applies stored appearance preferences before first paint, so a user on the
 * dark or comfortable setting never sees a flash of the light/compact default.
 * Must stay in sync with `applyPrefs` in components/app-shell/theme-provider.tsx.
 */
const NO_FOUC = `(function(){try{
var p=JSON.parse(localStorage.getItem('sh-appearance')||'{}'),e=document.documentElement;
if(p.theme&&p.theme!=='slate')e.setAttribute('data-theme',p.theme);
if(p.density&&p.density!=='compact')e.setAttribute('data-density',p.density);
if(p.mode==='dark')e.classList.add('dark');
}catch(_){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
