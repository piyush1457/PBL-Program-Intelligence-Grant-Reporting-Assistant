'use client';

import { useState, useEffect } from 'react';
import { formatPercent, formatNumber, formatMonthName } from '@/lib/utils';
import RiskBadge from '@/components/RiskBadge';
import { 
  FileText, Sparkles, Copy, Check, Calendar, Landmark, 
  Layers, Image as ImageIcon, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function Grants() {
  const [grants, setGrants] = useState<any[]>([]);
  const [selectedGrantId, setSelectedGrantId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2025-09'); // Default to September
  const [months, setMonths] = useState<string[]>(['2025-09', '2025-08', '2025-07']);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Narrative State
  const [generating, setGenerating] = useState(false);
  const [narrative, setNarrative] = useState<string>('');
  const [narrativeMode, setNarrativeMode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Load months filter metadata on mount
  useEffect(() => {
    async function fetchMonths() {
      try {
        const res = await fetch('/api/filters');
        if (res.ok) {
          const data = await res.json();
          if (data.months && data.months.length > 0) {
            setMonths(data.months);
            setSelectedMonth(data.months[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching filter months:', err);
      }
    }
    fetchMonths();
  }, []);

  // Fetch initial grant dropdown list and data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // We call the API first with default grant selection to populate the grants list
        const res = await fetch(`/api/grant?grantId=${selectedGrantId || 'GRANT_AA_2025'}&month=${selectedMonth}`);
        if (!res.ok) throw new Error('No data found for selected grant and month');
        const result = await res.json();
        
        setData(result);
        setGrants(result.grantsList || []);
        
        if (!selectedGrantId && result.grantsList?.length > 0) {
          setSelectedGrantId(result.grantsList[0].grant_id);
        }
        
        // Reset narrative when selection changes
        setNarrative('');
        setNarrativeMode('');
      } catch (err: any) {
        console.error('Error fetching grant data:', err);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedGrantId, selectedMonth]);

  const handleGenerateNarrative = async () => {
    if (!data) return;
    setGenerating(true);
    setNarrative('');
    setNarrativeMode('');
    try {
      // Assemble structured facts for LLM prompt context
      const financeRows = data.finance;
      const totalApprovedBudget = financeRows.reduce((sum: number, f: any) => sum + f.approved_budget, 0);
      const totalCumulativeUtilized = financeRows.reduce((sum: number, f: any) => sum + f.cumulative_utilized, 0);
      const utilizationRate = totalApprovedBudget > 0 ? totalCumulativeUtilized / totalApprovedBudget : 0;

      const facts = {
        grantName: data.performance?.grant_name || '',
        donor: data.performance?.donor || '',
        pblCompletionRate: data.performance?.pbl_completion_rate || 0,
        evidenceSubmissionRate: data.performance?.evidence_submission_rate || 0,
        attendanceRate: data.performance?.attendance_rate || 0,
        riskStatus: data.performance?.risk_status || 'Unknown',
        milestoneSummary: data.performance?.milestone_summary || 'No milestones logged',
        mediaCount: data.media?.length || 0,
        mediaDetails: data.media || [],
        budgetLines: financeRows,
        financeSummary: {
          totalApprovedBudget,
          totalCumulativeUtilized,
          utilizationRate
        }
      };

      const res = await fetch('/api/grant/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: selectedGrantId,
          month: selectedMonth,
          facts
        })
      });

      if (!res.ok) throw new Error('AI Generation failed');
      const result = await res.json();
      
      setNarrative(result.narrative);
      setNarrativeMode(result.mode);
    } catch (err: any) {
      console.error('Narrative generation error:', err);
      setNarrative(`Error generating narrative: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!data || !narrative) return;

    const exportText = `
# Grant Report: ${data.performance?.grant_name} (${selectedMonth})
Donor: ${data.performance?.donor}
Status: ${data.performance?.risk_status}

## Computed Fact Summaries
- PBL School Completion: ${(data.performance?.pbl_completion_rate * 100).toFixed(1)}%
- Evidence Submission Compliance: ${(data.performance?.evidence_submission_rate * 100).toFixed(1)}%
- Student Attendance Rate: ${(data.performance?.attendance_rate * 100).toFixed(1)}%
- Milestone Log: ${data.performance?.milestone_summary}

## AI-Generated Narrative (${narrativeMode})
${narrative}

## Source Audit Trail
Compiled from Mantra4Change PBL database records for reporting cycle ${selectedMonth}.
    `.trim();

    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Compute finance highlights if data is available
  const financeRows = data?.finance || [];
  const totalApprovedBudget = financeRows.reduce((sum: number, f: any) => sum + f.approved_budget, 0);
  const totalCumulativeUtilized = financeRows.reduce((sum: number, f: any) => sum + f.cumulative_utilized, 0);
  const totalUtilizationRate = totalApprovedBudget > 0 ? totalCumulativeUtilized / totalApprovedBudget : 0;

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-50 tracking-tight">
          Grant Reporting Assistant
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Compile donor narratives, verify financial utilization rows, and catalog media evidence.
        </p>
      </div>

      {/* Grant and Month Selector Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-900/60 shadow-sm flex flex-wrap items-center gap-4 mb-8">
        {/* Grant Select */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider">Select Grant</label>
          <select
            value={selectedGrantId}
            onChange={(e) => setSelectedGrantId(e.target.value)}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-zinc-300 min-w-[220px] cursor-pointer custom-select transition-all hover:border-slate-350 dark:hover:border-zinc-700"
          >
            {grants.map(g => (
              <option key={g.grant_id} value={g.grant_id}>
                {g.grant_name} ({g.donor})
              </option>
            ))}
          </select>
        </div>

        {/* Month Select */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider">Reporting Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 dark:text-zinc-300 min-w-[140px] cursor-pointer custom-select transition-all hover:border-slate-350 dark:hover:border-zinc-700"
          >
            {months.map(m => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load grant data: {error}</span>
        </div>
      )}

      {/* Main Grid: Left Fact Panel, Right AI Generator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Columns (7): Fact Panel & Finance */}
        <div className="xl:col-span-7 space-y-8">
          
          {/* Performance & Milestones Card */}
          <div className="premium-card p-6">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-900 pb-4 mb-5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Grant Fact Summary
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-zinc-500 mt-1 font-semibold">
                  Computed outcomes for cycle {formatMonthName(selectedMonth)}
                </p>
              </div>
              {data?.performance && (
                <RiskBadge level={data.performance.risk_status} className="text-[9px] px-2 py-0.5" />
              )}
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading outcomes...</div>
            ) : !data?.performance ? (
              <div className="text-center py-6 text-slate-500 text-xs font-semibold">No implementation data logged for this month</div>
            ) : (
              <div className="space-y-6">
                {/* Metric breakdown row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 p-4 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-555 uppercase font-bold tracking-wider block">PBL Completion</span>
                    <span className="text-xl font-black text-slate-850 dark:text-zinc-200 mt-1 block">
                      {formatPercent(data.performance.pbl_completion_rate)}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block mt-1">
                      {data.performance.schools_completed_pbl} of {data.performance.sampled_school_records} schools
                    </span>
                  </div>
                  
                  <div className="bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 p-4 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-555 uppercase font-bold tracking-wider block">Evidence rate</span>
                    <span className="text-xl font-black text-slate-850 dark:text-zinc-200 mt-1 block">
                      {formatPercent(data.performance.evidence_submission_rate)}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block mt-1">
                      {data.performance.schools_with_evidence} upload packs
                    </span>
                  </div>
                  
                  <div className="bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 p-4 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-555 uppercase font-bold tracking-wider block">Attendance Rate</span>
                    <span className="text-xl font-black text-slate-850 dark:text-zinc-200 mt-1 block">
                      {formatPercent(data.performance.attendance_rate)}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block mt-1">
                      {formatNumber(data.performance.total_attendance)} sessions
                    </span>
                  </div>
                </div>

                {/* Milestones Log */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/2 border border-emerald-500/10 rounded-xl p-4 border-l-4 border-l-emerald-500">
                  <span className="text-[9px] font-extrabold uppercase text-emerald-600 dark:text-emerald-450 tracking-wider block mb-1">
                    Milestone Summary Status
                  </span>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-medium">
                    {data.performance.milestone_summary}
                  </p>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-900/60 pt-4">
                  <div className="flex gap-2">
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5">Status:</span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">{data.performance.report_status || 'Draft'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5">Regions:</span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-300 line-clamp-1" title={data.performance.covered_districts}>{data.performance.covered_districts}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial Utilization Table */}
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900/80 pb-3">
              <Landmark className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
              <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest leading-none">
                Financial Utilization Rate
              </h3>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading financials...</div>
            ) : financeRows.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-semibold">No utilization logs found for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-zinc-900 text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-extrabold text-[9px]">
                      <th className="py-3 px-1">Budget Line</th>
                      <th className="py-3 text-right">Approved Budget</th>
                      <th className="py-3 text-right">Cumulative Utilized</th>
                      <th className="py-3 text-right pr-1">Util. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeRows.map((f: any, idx: number) => {
                      const rate = f.approved_budget > 0 ? f.cumulative_utilized / f.approved_budget : 0;
                      return (
                        <tr key={idx} className="border-b border-slate-50 dark:border-zinc-900/40 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3 px-1 font-bold text-slate-700 dark:text-zinc-300">
                            {f.budget_line}
                            <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-0.5">{f.finance_note}</span>
                          </td>
                          <td className="py-3 text-right text-slate-650 dark:text-zinc-400 font-semibold">{formatNumber(f.approved_budget)}</td>
                          <td className="py-3 text-right text-slate-650 dark:text-zinc-400 font-semibold">{formatNumber(f.cumulative_utilized)}</td>
                          <td className="py-3 text-right pr-1">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-emerald-600 dark:text-emerald-450">{formatPercent(rate)}</span>
                              <div className="w-16 bg-slate-100 dark:bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rate >= 0.85 ? 'bg-emerald-500' : rate >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(rate * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Grand Total Row */}
                    <tr className="font-extrabold bg-slate-50/50 dark:bg-zinc-900/30">
                      <td className="py-3 px-2 rounded-l-lg text-slate-800 dark:text-zinc-200">Total Utilization</td>
                      <td className="py-3 text-right text-slate-800 dark:text-zinc-200">{formatNumber(totalApprovedBudget)}</td>
                      <td className="py-3 text-right text-slate-800 dark:text-zinc-200">{formatNumber(totalCumulativeUtilized)}</td>
                      <td className="py-3 text-right pr-2 rounded-r-lg">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-extrabold text-emerald-650 dark:text-emerald-400">{formatPercent(totalUtilizationRate)}</span>
                          <div className="w-16 bg-slate-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(totalUtilizationRate * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Evidence Gallery Component */}
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900/80 pb-3">
              <ImageIcon className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
              <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest leading-none">
                Linked Evidence Assets ({data?.media?.length || 0})
              </h3>
            </div>

            {loading ? (
              <div className="h-28 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading evidence...</div>
            ) : !data?.media || data.media.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-semibold">No media assets indexed for this month</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.media.map((item: any) => {
                  const imgSrc = `/images/${item.file_name}`;
                  return (
                    <div key={item.record_id} className="border border-slate-150 dark:border-zinc-900/60 rounded-xl p-3 flex flex-col justify-between bg-white/40 dark:bg-zinc-950/20 shadow-sm transition-all duration-350 hover:border-slate-250 dark:hover:border-zinc-800 hover:shadow-md group">
                      <div>
                        {/* Image overlay container */}
                        <div className="relative w-full h-36 bg-slate-100 dark:bg-zinc-900 rounded-lg overflow-hidden mb-3">
                          <img 
                            src={imgSrc} 
                            alt={item.title} 
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[9px] font-bold text-white uppercase tracking-wider">
                            {item.record_type}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-300 line-clamp-1">{item.title}</span>
                        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2" title={item.summary_or_caption}>
                          {item.summary_or_caption}
                        </p>
                      </div>
                      <div className="mt-3 border-t border-slate-100 dark:border-zinc-900/40 pt-2.5 text-[9px] text-slate-400 dark:text-zinc-500 flex justify-between font-bold uppercase tracking-wider">
                        <span>ID: {item.record_id}</span>
                        <span>Region: {item.district}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (5): AI Report Generator */}
        <div className="xl:col-span-5 bg-white/60 dark:bg-zinc-950/30 p-6 rounded-2xl border border-slate-200 dark:border-zinc-900 shadow-sm flex flex-col min-h-[600px] justify-between h-full relative">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-4 mb-5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                  AI Narrative Assistant
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 font-semibold">
                  Conversational report builder
                </p>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 mb-4">
              
              {/* Initial Bot Welcome message when no narrative & not generating */}
              {!narrative && !generating && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="bg-white/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-xl rounded-tl-none text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-semibold shadow-sm max-w-[85%]">
                    <p>Hello! I am your Program Intelligence Assistant. Select a grant and reporting month in the filters above, then click **Generate Report Section** below to compile database metrics into a report-ready updates package.</p>
                  </div>
                </div>
              )}

              {/* User Prompt Message Bubble (shown when generating OR when narrative exists) */}
              {(generating || narrative) && (
                <div className="flex gap-2.5 items-start justify-end">
                  <div className="bg-emerald-600 text-white p-3.5 rounded-xl rounded-tr-none text-xs leading-relaxed font-semibold shadow-md max-w-[85%]">
                    <p>Assemble a report-ready section for grant <strong className="underline">{data?.performance?.grant_name || selectedGrantId}</strong> during the <strong className="underline">{formatMonthName(selectedMonth)}</strong> cycle.</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 shrink-0 text-xs font-bold shadow-sm">
                    U
                  </div>
                </div>
              )}

              {/* Bot Thinking / Generating State Bubble */}
              {generating && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="bg-white/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-xl rounded-tl-none text-xs leading-relaxed text-slate-550 dark:text-zinc-400 font-semibold shadow-sm flex items-center gap-2 max-w-[85%] animate-pulse">
                    <span className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shrink-0" />
                    <span>Compiling metrics and database utilization rows...</span>
                  </div>
                </div>
              )}

              {/* Bot Response Bubble containing narrative card */}
              {!generating && narrative && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="flex-1 max-w-[90%] bg-white/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl rounded-tl-none shadow-sm flex flex-col">
                    
                    {/* Mode badge and toolbars */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2 mb-3.5">
                      <span className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-widest leading-none">
                        Report response card ({narrativeMode})
                      </span>
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase rounded-md border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-emerald-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy text</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Report Text Paragraphs */}
                    <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-medium select-text">
                      {narrative.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>

                    {/* Source Facts Traceability section */}
                    {data && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-900/60 text-[9px] text-slate-450 dark:text-zinc-500 font-semibold leading-relaxed">
                        <span className="font-extrabold uppercase text-[8px] tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">Source Evidence Trail:</span>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          <li>PBL implementation: {(data.performance.pbl_completion_rate * 100).toFixed(1)}%</li>
                          <li>Financial rate: {formatPercent(totalUtilizationRate)} (${formatNumber(totalCumulativeUtilized)} used)</li>
                          <li>Linked media records: {data.media?.length || 0} items</li>
                        </ul>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Action Trigger Box / input bar mock */}
          <div className="border-t border-slate-100 dark:border-zinc-900/80 pt-4 mt-2 w-full">
            <button
              onClick={handleGenerateNarrative}
              disabled={loading || generating || !data}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{narrative ? 'Regenerate Narrative Section' : 'Generate Narrative Section'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
