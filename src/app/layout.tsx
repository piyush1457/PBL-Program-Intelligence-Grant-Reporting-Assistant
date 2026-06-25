import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mantra4Change — PBL Program Intelligence & Grant Reporting Assistant',
  description: 'Convert raw PBL responses into monthly progress dashboards, deterministic risk metrics, and grant-ready narratives.',
  authors: [{ name: 'Mantra4Change' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-transparent text-slate-800 dark:text-zinc-200 antialiased flex`}>
        {/* Subtle grid and gradient glow background layer */}
        <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
          <div className="absolute -top-[30%] -left-[10%] h-[70%] w-[60%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px]" />
          <div className="absolute -top-[30%] -right-[10%] h-[70%] w-[60%] rounded-full bg-teal-500/10 dark:bg-teal-500/5 blur-[120px]" />
        </div>

        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Workspace Panel */}
        <main className="flex-1 ml-64 min-h-screen flex flex-col p-8 md:p-10 max-w-7xl overflow-x-hidden relative">
          {children}
        </main>
      </body>
    </html>
  );
}
