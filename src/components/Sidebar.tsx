'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Map, FileText, CalendarRange, Sun, Moon, Info, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { name: 'Program Review Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'District & Block Explorer', href: '/explorer', icon: Map },
    { name: 'Grant Reporting Assistant', href: '/grants', icon: FileText },
    { name: 'Monthly Review Summary', href: '/review', icon: CalendarRange },
  ];

  return (
    <aside className="w-64 border-r border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-xl flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-zinc-900/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10 shrink-0">
          <Compass className="w-5 h-5 text-white animate-spin-slow" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-wider text-slate-800 dark:text-zinc-100 leading-none">MANTRA4CHANGE</span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold tracking-wide uppercase mt-1 leading-none">Program Intelligence</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 text-xs font-semibold rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/10 shadow-sm shadow-emerald-500/5" 
                  : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/60 hover:text-slate-800 dark:hover:text-zinc-200 border border-transparent"
              )}
            >
              {/* Active Indicator dot */}
              {isActive && (
                <span className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-emerald-500 rounded-r-md" />
              )}
              
              <Icon className={cn("w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:scale-105", 
                isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:group-hover:text-zinc-400"
              )} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer controls & metadata */}
      <div className="p-4 border-t border-slate-100 dark:border-zinc-900/80 flex flex-col gap-4">
        {/* Modern Theme Switch Toggle */}
        <div 
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/60 rounded-xl cursor-pointer transition-all duration-200 select-none border border-transparent hover:border-slate-100 dark:hover:border-zinc-800"
        >
          <span className="flex items-center gap-3">
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
            <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </span>
          <span className="w-8 h-4.5 bg-slate-200 dark:bg-zinc-800 rounded-full relative p-0.5 transition-colors duration-300 flex items-center">
            <span className={cn(
              "block w-3.5 h-3.5 bg-white dark:bg-emerald-500 rounded-full shadow-sm transition-transform duration-300",
              darkMode ? "translate-x-3.5" : "translate-x-0"
            )} />
          </span>
        </div>

        {/* Data disclaimer card */}
        <div className="bg-slate-50/80 dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 flex gap-2.5">
          <Info className="w-4 h-4 text-emerald-500 dark:text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-slate-400 dark:text-zinc-500 font-medium">
            <strong className="text-slate-500 dark:text-zinc-400">Synthetic Assets</strong>: This dashboard displays mock data for review purposes.
          </p>
        </div>
      </div>
    </aside>
  );
}
