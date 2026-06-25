import { ArrowUpRight, ArrowDownRight, GraduationCap, TrendingUp, ClipboardCheck, Users } from 'lucide-react';
import { formatMoMDelta } from '@/lib/risk';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  prevValue?: number;
  currentRate?: number; // Rate between 0 and 1
  isPercentage?: boolean;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

// Sparkline SVG component representing visual trends
const Sparkline = ({ direction }: { direction: 'up' | 'down' | 'flat' }) => {
  const strokeColor = direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#64748b';
  const fillGradient = direction === 'up' ? 'url(#sparkline-grad-up)' : direction === 'down' ? 'url(#sparkline-grad-down)' : 'none';
  const pathD = direction === 'up' 
    ? "M 2,16 C 10,13 14,14 18,8 C 22,5 30,11 34,4 C 38,1 42,3 46,2" 
    : direction === 'down'
    ? "M 2,3 C 10,7 14,6 18,11 C 22,14 30,9 34,14 C 38,16 42,14 46,15"
    : "M 2,9 C 14,9 28,9 46,9";

  return (
    <svg className="w-12 h-6 shrink-0 overflow-visible opacity-80" viewBox="0 0 48 18">
      <defs>
        <linearGradient id="sparkline-grad-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="sparkline-grad-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Gradient area */}
      {direction !== 'flat' && (
        <path 
          d={`${pathD} L 46,18 L 2,18 Z`} 
          fill={fillGradient} 
        />
      )}
      {/* Path line */}
      <path 
        d={pathD} 
        fill="none" 
        stroke={strokeColor} 
        strokeWidth="1.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};

export default function KPICard({
  title,
  value,
  prevValue,
  currentRate,
  subtitle,
  loading = false,
  className
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white/50 dark:bg-zinc-950/40 p-6 rounded-2xl border border-slate-100 dark:border-zinc-900 animate-pulse flex flex-col justify-between min-h-[145px]">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/3"></div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
        </div>
        <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-1/2 my-3"></div>
        <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-2/3"></div>
      </div>
    );
  }

  // Calculate MoM delta if rate is provided
  let momText = '';
  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  
  if (currentRate !== undefined && prevValue !== undefined) {
    const delta = formatMoMDelta(currentRate, prevValue);
    momText = delta.text;
    trendDirection = delta.direction;
  }

  // Determine icon based on KPI title
  const getIcon = () => {
    const t = title.toLowerCase();
    if (t.includes('school')) return <GraduationCap className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />;
    if (t.includes('participation')) return <TrendingUp className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />;
    if (t.includes('evidence')) return <ClipboardCheck className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />;
    if (t.includes('attendance')) return <Users className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />;
    return <TrendingUp className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />;
  };

  return (
    <div className={cn(
      "premium-card p-6 flex flex-col justify-between min-h-[145px] relative group overflow-hidden",
      className
    )}>
      {/* Hover background highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Card Header (Title & Icon) */}
      <div className="flex justify-between items-start gap-4">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 flex items-center justify-center shadow-sm shrink-0">
          {getIcon()}
        </div>
      </div>

      {/* Primary Value */}
      <div className="my-2.5 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-zinc-100">
          {value}
        </span>
        {/* Render sparkline if trends exist, otherwise draw a steady upward trend for capacity */}
        <Sparkline direction={momText ? trendDirection : 'up'} />
      </div>

      {/* Subtitle & Trend delta */}
      {subtitle || momText ? (
        <div className="flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-zinc-900/60 pt-2.5 mt-1">
          <span className="text-slate-450 dark:text-zinc-400 font-semibold truncate max-w-[65%]">
            {subtitle}
          </span>
          {momText && (
            <span className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[10px] shrink-0",
              trendDirection === 'up' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450",
              trendDirection === 'down' && "bg-rose-500/10 text-rose-600 dark:text-rose-450",
              trendDirection === 'flat' && "bg-slate-500/10 text-slate-550 dark:text-zinc-400"
            )}>
              {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />}
              {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
              <span>{momText}</span>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
