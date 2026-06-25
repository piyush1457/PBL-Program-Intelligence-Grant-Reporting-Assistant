'use client';

import { useState, useEffect } from 'react';
import { formatPercent, formatMonthName } from '@/lib/utils';
import RiskBadge from '@/components/RiskBadge';
import { 
  Calendar, Sparkles, Copy, Check, CheckCircle2, 
  AlertTriangle, ArrowDownRight, Compass, HelpCircle, FileSpreadsheet 
} from 'lucide-react';

export default function ReviewSummary() {
  const [selectedMonth, setSelectedMonth] = useState('2025-09'); // Default to latest month
  const [months, setMonths] = useState<string[]>(['2025-09', '2025-08', '2025-07']);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Summary State
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [summaryMode, setSummaryMode] = useState<string>('');
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

  // Load deterministic review data when month changes
  useEffect(() => {
    async function loadReviewData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/review-summary?month=${selectedMonth}`);
        if (!res.ok) throw new Error('Failed to load review data');
        const result = await res.json();
        setData(result);

        // Reset summary when month changes
        setSummary('');
        setSummaryMode('');
      } catch (err: any) {
        console.error('Error fetching review data:', err);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadReviewData();
  }, [selectedMonth]);

  const handleGenerateSummary = async () => {
    if (!data) return;
    setGenerating(true);
    setSummary('');
    setSummaryMode('');
    try {
      const res = await fetch('/api/review-summary/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          facts: data
        })
      });

      if (!res.ok) throw new Error('AI Generation failed');
      const result = await res.json();
      
      setSummary(result.narrative);
      setSummaryMode(result.mode);
    } catch (err: any) {
      console.error('Summary generation error:', err);
      setSummary(`Error generating summary: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!data) return;

    const exportText = `
# Executive Monthly Review: ${formatMonthName(selectedMonth)}

## 1. Key Achievements
${data.achievements.map((a: string) => `- ${a}`).join('\n')}

## 2. Identified Implementation Gaps
${data.gaps.map((g: string) => `- ${g}`).join('\n')}

## 3. Bottom 5 Blocks (Priorities for Follow-up)
${data.priorityGeographies.map((b: any, idx: number) => `${idx + 1}. Block: ${b.name} (${b.district}) | Attendance: ${(b.attendanceRate * 100).toFixed(1)}% | Participation: ${(b.participationRate * 100).toFixed(1)}% | Status: ${b.overallRisk}`).join('\n')}

## 4. Discussion Prompts
${data.discussionPrompts.map((p: string) => `- ${p}`).join('\n')}

${summary ? `
## 5. Executive AI Summary (${summaryMode})
${summary}
` : ''}

---
Compiled from Mantra4Change PBL database records.
    `.trim();

    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-50 tracking-tight">
          Review Preparation & Summary
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Draft discussion agendas, audit bottom block rankings, and synthesize monthly briefs.
        </p>
      </div>

      {/* Selector Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-900/60 shadow-sm flex flex-wrap items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-500 tracking-wider">Review Cycle</label>
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

        {data && (
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-750 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer active:scale-95 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Copied Agenda</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Agenda Package</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl mb-6 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Grid Layout: Left Deterministic Agenda, Right AI Review Narrative */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (7): Deterministic Review Cards */}
        <div className="xl:col-span-7 space-y-8">
          
          {/* Achievements Card */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              Key Implementation Achievements
            </h3>
            {loading ? (
              <div className="h-24 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading achievements...</div>
            ) : data?.achievements?.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">No notable highlights for this month.</p>
            ) : (
              <ul className="space-y-3.5">
                {data.achievements.map((item: string, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start text-xs font-medium text-slate-750 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gaps & Risks Card */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-slate-850 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Identified Implementation Gaps
            </h3>
            {loading ? (
              <div className="h-24 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading gaps...</div>
            ) : data?.gaps?.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">No implementation gaps detected.</p>
            ) : (
              <ul className="space-y-3.5">
                {data.gaps.map((item: string, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start text-xs font-medium text-slate-750 dark:text-zinc-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Priority Geographies (Bottom Blocks) */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
              <ArrowDownRight className="w-4.5 h-4.5 text-rose-500" />
              Priority Geographies (Bottom 5 Blocks)
            </h3>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading priorities...</div>
            ) : !data?.priorityGeographies || data.priorityGeographies.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">No priorities calculated.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-900 text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-extrabold text-[9px] pb-2">
                      <th className="py-2.5 px-1">Block Name</th>
                      <th className="py-2.5">District</th>
                      <th className="py-2.5 text-right font-bold">Attendance</th>
                      <th className="py-2.5 text-right font-bold">Participation</th>
                      <th className="py-2.5 text-center font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.priorityGeographies.map((b: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-50 dark:border-zinc-900/40 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3 px-1 font-bold text-slate-750 dark:text-zinc-300">{b.name}</td>
                        <td className="py-3 text-slate-500 font-medium">{b.district}</td>
                        <td className="py-3 text-right font-extrabold text-slate-800 dark:text-zinc-200">{formatPercent(b.attendanceRate)}</td>
                        <td className="py-3 text-right text-slate-600 dark:text-zinc-400 font-semibold">{formatPercent(b.participationRate)}</td>
                        <td className="py-3 text-center">
                          <RiskBadge level={b.overallRisk} className="text-[9px] px-2 py-0.5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Discussion Prompts Card */}
          <div className="premium-card p-6">
            <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
              <HelpCircle className="w-4.5 h-4.5 text-emerald-500" />
              Suggested Review Discussion Prompts
            </h3>
            {loading ? (
              <div className="h-24 flex items-center justify-center text-slate-400 text-xs font-semibold">Loading prompts...</div>
            ) : !data?.discussionPrompts || data.discussionPrompts.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">No prompts logged.</p>
            ) : (
              <ul className="space-y-3">
                {data.discussionPrompts.map((item: string, idx: number) => (
                  <li key={idx} className="bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-150 dark:border-zinc-900/60 p-3.5 rounded-xl text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-semibold border-l-4 border-l-emerald-500 shadow-sm">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* Right Column (5): AI Executive Review Narrative */}
        <div className="xl:col-span-5 bg-white/60 dark:bg-zinc-950/30 p-6 rounded-2xl border border-slate-200 dark:border-zinc-900 shadow-sm flex flex-col min-h-[600px] justify-between h-full relative">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-4 mb-5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-805 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-450 animate-pulse" />
                  Executive AI Summary
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-zinc-500 mt-1 font-semibold">
                  Conversational briefing builder
                </p>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 mb-4">
              
              {/* Initial Bot Welcome message when no summary & not generating */}
              {!summary && !generating && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="bg-white/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-xl rounded-tl-none text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-semibold shadow-sm max-w-[85%]">
                    <p>Hello! I am your Executive Review Assistant. Select a month in the review cycle filters, then click **Generate Meeting Briefing** below to summarize monthly achievements, gaps, and priorities into a meeting updates brief.</p>
                  </div>
                </div>
              )}

              {/* User Prompt Message Bubble (shown when generating OR when summary exists) */}
              {(generating || summary) && (
                <div className="flex gap-2.5 items-start justify-end">
                  <div className="bg-emerald-600 text-white p-3.5 rounded-xl rounded-tr-none text-xs leading-relaxed font-semibold shadow-md max-w-[85%]">
                    <p>Synthesize implementation outcomes and agenda priority lists for the <strong className="underline">{formatMonthName(selectedMonth)}</strong> review briefing cycle.</p>
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
                    <span>Compiling priorities, achievement milestones, and district logs...</span>
                  </div>
                </div>
              )}

              {/* Bot Response Bubble containing briefing card */}
              {!generating && summary && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-xs font-bold shadow-sm">
                    AI
                  </div>
                  <div className="flex-1 max-w-[90%] bg-white/90 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl rounded-tl-none shadow-sm flex flex-col">
                    
                    {/* Mode badge and toolbars */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2 mb-3.5">
                      <span className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-widest leading-none">
                        Briefing notes response ({summaryMode})
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
                            <span>Copy briefing</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Briefing Text Paragraphs */}
                    <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-zinc-300 font-medium select-text">
                      {summary.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>

                    {/* Source facts audit */}
                    {data && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-900/60 text-[9px] text-slate-450 dark:text-zinc-500 font-semibold leading-relaxed">
                        <span className="font-extrabold uppercase text-[8px] tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">Grounded milestones:</span>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          <li>Achievements tracked: {data.achievements?.length || 0} highlights</li>
                          <li>Identified risk gaps: {data.gaps?.length || 0} issues</li>
                          <li>Follow-up geolist: {data.priorityGeographies?.length || 0} priority blocks</li>
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
              onClick={handleGenerateSummary}
              disabled={loading || generating || !data}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{summary ? 'Regenerate Meeting Briefing' : 'Generate Meeting Briefing'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
