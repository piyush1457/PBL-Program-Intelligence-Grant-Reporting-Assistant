import { RiskLevel, getRiskColorClass } from '@/lib/risk';
import RiskBadge from './RiskBadge';
import { formatPercent } from '@/lib/utils';
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RiskExplanationProps {
  name: string;
  type: 'district' | 'block';
  participationRate: number;
  evidenceRate: number;
  attendanceRate: number;
  overallRisk: RiskLevel;
  reason: string;
}

export default function RiskExplanation({
  name,
  type,
  participationRate,
  evidenceRate,
  attendanceRate,
  overallRisk,
  reason
}: RiskExplanationProps) {
  const colors = getRiskColorClass(overallRisk);

  const getMetricIcon = (rate: number) => {
    if (rate >= 0.75) return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />;
    if (rate >= 0.60) return <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />;
    if (rate >= 0.35) return <AlertTriangle className="w-4.5 h-4.5 text-orange-500" />;
    return <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />;
  };

  const getMetricLabel = (rate: number) => {
    if (rate >= 0.75) return 'On Track (≥ 75%)';
    if (rate >= 0.60) return 'Behind (60% - 74%)';
    if (rate >= 0.35) return 'At Risk (35% - 59%)';
    return 'Critical (< 35%)';
  };

  const getMetricBadgeStyle = (rate: number) => {
    if (rate >= 0.75) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500';
    if (rate >= 0.60) return 'bg-amber-500/10 text-amber-600 dark:text-amber-500';
    if (rate >= 0.35) return 'bg-orange-500/10 text-orange-600 dark:text-orange-500';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-500';
  };

  // Determine explanation callout color classes based on overall risk
  const getExplanationBorder = () => {
    if (overallRisk === 'On Track') return 'border-l-4 border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/2';
    if (overallRisk === 'Behind') return 'border-l-4 border-l-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/2';
    if (overallRisk === 'At Risk') return 'border-l-4 border-l-orange-500 bg-orange-500/5 dark:bg-orange-500/2';
    return 'border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-500/2';
  };

  return (
    <div className="premium-card p-6 flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-4 mb-5">
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span>Diagnosis: {name}</span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">({type})</span>
          </h3>
          <p className="text-[10px] text-slate-450 dark:text-zinc-500 mt-1 font-semibold">
            Worst-of-three decision rule applied.
          </p>
        </div>
        <RiskBadge level={overallRisk} className="text-[10px] px-3 py-1 font-bold uppercase tracking-wider" />
      </div>

      {/* Summary Narrative callout with left border */}
      <div className={`p-4 rounded-r-xl border-t border-r border-b border-slate-100 dark:border-zinc-900/60 leading-relaxed text-xs text-slate-700 dark:text-zinc-400 mb-6 ${getExplanationBorder()}`}>
        <span className="font-extrabold uppercase text-[9px] tracking-widest text-slate-400 dark:text-zinc-500 block mb-1">Trigger Explanation</span>
        <p className="font-medium text-slate-650 dark:text-zinc-300">{reason}</p>
      </div>

      {/* Metric Threshold Cards */}
      <div className="space-y-3.5">
        <h4 className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-widest">
          Performance Breakdown
        </h4>

        {/* 1. Participation */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-150/40 dark:border-zinc-800/80 flex items-center justify-center shadow-sm">
              {getMetricIcon(participationRate)}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">PBL Participation</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">School implementation rate</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-slate-800 dark:text-zinc-100 block">{formatPercent(participationRate)}</span>
            <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-0.5 ${getMetricBadgeStyle(participationRate)}`}>
              {getMetricLabel(participationRate)}
            </span>
          </div>
        </div>

        {/* 2. Evidence */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-150/40 dark:border-zinc-800/80 flex items-center justify-center shadow-sm">
              {getMetricIcon(evidenceRate)}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">Evidence Uploads</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">Evidence compliance in schools</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-slate-800 dark:text-zinc-100 block">{formatPercent(evidenceRate)}</span>
            <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-0.5 ${getMetricBadgeStyle(evidenceRate)}`}>
              {getMetricLabel(evidenceRate)}
            </span>
          </div>
        </div>

        {/* 3. Attendance */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-150/40 dark:border-zinc-800/80 flex items-center justify-center shadow-sm">
              {getMetricIcon(attendanceRate)}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">Student Attendance</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">Average classroom attendance rate</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-slate-800 dark:text-zinc-100 block">{formatPercent(attendanceRate)}</span>
            <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-0.5 ${getMetricBadgeStyle(attendanceRate)}`}>
              {getMetricLabel(attendanceRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
