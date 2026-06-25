'use client';

import { useState } from 'react';
import useSWR from 'swr';
import FilterBar, { FilterState } from '@/components/FilterBar';
import KPICard from '@/components/KPICard';
import { formatPercent, formatNumber } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to load dashboard metrics');
  return res.json();
});

// Custom modern glassmorphic tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 p-3 rounded-xl shadow-lg text-[11px] flex flex-col gap-1.5 min-w-[155px]">
        <p className="font-extrabold text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-900 pb-1.5 mb-0.5">
          {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-800 dark:text-zinc-100">
                {typeof entry.value === 'number' && entry.name.toLowerCase().includes('rate')
                  ? `${entry.value.toFixed(1)}%`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState | null>(null);

  // Construct stable query key for SWR
  const queryKey = filters 
    ? `/api/dashboard?month=${filters.month}` +
      (filters.district ? `&district=${filters.district}` : '') +
      (filters.block ? `&block=${filters.block}` : '') +
      (filters.grade ? `&grade=${filters.grade}` : '') +
      (filters.subject ? `&subject=${filters.subject}` : '')
    : null;

  const { data, error } = useSWR(queryKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 // Cache for 60 seconds
  });

  const loading = !data && !error;

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header with Quick stats details */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-50 tracking-tight">
            Program Review Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Analyze PBL implementation rates, evidence logs, and geo-risk summaries in real-time.
          </p>
        </div>
        
        {/* Refresh Indicator or quick meta */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 bg-white/40 dark:bg-zinc-900/40 rounded-xl border border-slate-200/50 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>{loading ? 'Syncing records...' : 'Records Grounded'}</span>
        </div>
      </div>

      {/* Filter Selector */}
      <FilterBar onFilterChange={handleFilterChange} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2">
          <span>Failed to load dashboard metrics: {error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Seed Schools"
          value={loading || !data ? '--' : formatNumber(data.current.totalSchools)}
          subtitle="Schools in selection"
          loading={loading}
        />
        <KPICard
          title="PBL Participation"
          value={loading || !data ? '--' : formatPercent(data.current.participationPercentage)}
          currentRate={data?.current?.participationPercentage}
          prevValue={data?.previous?.participationPercentage}
          subtitle={`${data?.current?.participatingSchools || 0} active schools`}
          loading={loading}
        />
        <KPICard
          title="Evidence Submission"
          value={loading || !data ? '--' : formatPercent(data.current.evidenceSubmissionPercentage)}
          currentRate={data?.current?.evidenceSubmissionPercentage}
          prevValue={data?.previous?.evidenceSubmissionPercentage}
          subtitle="Of active schools"
          loading={loading}
        />
        <KPICard
          title="Student PBL Attendance"
          value={loading || !data ? '--' : formatPercent(data.current.attendancePercentage)}
          currentRate={data?.current?.attendancePercentage}
          prevValue={data?.previous?.attendancePercentage}
          subtitle={`${formatNumber(data?.current?.totalAttendance || 0)} student-sessions`}
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Beautiful Area Chart */}
        <div className="lg:col-span-2 premium-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest leading-none">
                3-Month Trend Performance
              </h3>
            </div>
            <span className="text-[10px] bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 px-2.5 py-1 rounded-lg text-slate-450 dark:text-zinc-400 font-bold uppercase tracking-wider">
              % Metrics
            </span>
          </div>
          
          <div className="w-full h-[300px] text-[10px]">
            {loading || !data ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold">Loading chart data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEvidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a15" vertical={false} />
                  
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={5}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Legend 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  
                  <Area
                    type="monotone"
                    name="Participation Rate"
                    dataKey="participationRate"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorParticipation)"
                  />
                  <Area
                    type="monotone"
                    name="Evidence Rate"
                    dataKey="evidenceRate"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorEvidence)"
                  />
                  <Area
                    type="monotone"
                    name="Attendance Rate"
                    dataKey="attendanceRate"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAttendance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Stacked Bar Chart with Rounded corners */}
        <div className="premium-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest leading-none">
                School Risk Trends
              </h3>
            </div>
            <span className="text-[10px] bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 px-2.5 py-1 rounded-lg text-slate-450 dark:text-zinc-400 font-bold uppercase tracking-wider">
              Geo Count
            </span>
          </div>

          <div className="w-full h-[300px] text-[10px]">
            {loading || !data ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold">Loading chart data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.trend}
                  margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a15" vertical={false} />
                  
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={5}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Legend 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  
                  {/* Styled bars with clean color values and small corner radii */}
                  <Bar name="On Track" dataKey="onTrack" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar name="Behind" dataKey="behind" stackId="a" fill="#eab308" radius={[3, 3, 0, 0]} />
                  <Bar name="At Risk" dataKey="atRisk" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
                  <Bar name="Critical" dataKey="critical" stackId="a" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
