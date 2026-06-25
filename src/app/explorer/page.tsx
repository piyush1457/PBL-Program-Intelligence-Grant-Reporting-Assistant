'use client';

import { useState, useEffect } from 'react';
import FilterBar, { FilterState } from '@/components/FilterBar';
import RiskBadge from '@/components/RiskBadge';
import RiskExplanation from '@/components/RiskExplanation';
import { formatPercent } from '@/lib/utils';
import { ShieldCheck, MapPin, BarChart3, HelpCircle } from 'lucide-react';

export default function Explorer() {
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');
  const [selectedBlockName, setSelectedBlockName] = useState<string>('');
  
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load districts list when month changes
  useEffect(() => {
    const month = filters?.month;
    if (!month) return;

    async function loadDistricts() {
      setLoadingDistricts(true);
      setError(null);
      try {
        const res = await fetch(`/api/districts?month=${month}`);
        if (!res.ok) throw new Error('Failed to load district rankings');
        const data = await res.json();
        setDistricts(data.districts);
        
        // Auto-select the first district if none is currently selected
        if (data.districts.length > 0) {
          const firstDistrict = data.districts[0].name;
          setSelectedDistrictName(firstDistrict);
          setSelectedBlockName('');
        }
      } catch (err: any) {
        console.error('Error fetching districts:', err);
        setError(err.message);
      } finally {
        setLoadingDistricts(false);
      }
    }

    loadDistricts();
  }, [filters?.month]);

  // Load blocks list when district or month changes
  useEffect(() => {
    const month = filters?.month;
    if (!month || !selectedDistrictName) {
      setBlocks([]);
      return;
    }

    async function loadBlocks() {
      setLoadingBlocks(true);
      try {
        const res = await fetch(`/api/blocks?month=${month}&district=${selectedDistrictName}`);
        if (!res.ok) throw new Error('Failed to load block rankings');
        const data = await res.json();
        setBlocks(data.blocks);
        setSelectedBlockName(''); // Reset selected block on district change
      } catch (err: any) {
        console.error('Error fetching blocks:', err);
      } finally {
        setLoadingBlocks(false);
      }
    }

    loadBlocks();
  }, [filters?.month, selectedDistrictName]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleDistrictClick = (name: string) => {
    setSelectedDistrictName(name);
    setSelectedBlockName('');
  };

  const handleBlockClick = (name: string) => {
    setSelectedBlockName(name);
  };

  // Get current active district info for the details panel
  const activeDistrictInfo = districts.find(d => d.name === selectedDistrictName);
  
  // Get current active block info for the details panel
  const activeBlockInfo = blocks.find(b => b.name === selectedBlockName);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-50 tracking-tight">
          District & Block Explorer
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Rank districts and blocks by execution index, drill down, and diagnose risk parameters.
        </p>
      </div>

      {/* Filter Selector (Only Month selector needed since page has list drilldown) */}
      <FilterBar onFilterChange={handleFilterChange} showGeoFilters={false} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl mb-6 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: District Rankings List */}
        <div className="lg:col-span-4 premium-card p-5 h-[650px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
            <h3 className="text-xs font-extrabold text-slate-850 dark:text-zinc-200 uppercase tracking-widest leading-none">
              District Rankings
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {loadingDistricts ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">Loading districts...</div>
            ) : districts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No data found</div>
            ) : (
              districts.map((d, index) => {
                const isSelected = selectedDistrictName === d.name;
                const riskColors = 
                  d.overallRisk === 'On Track' ? 'border-l-emerald-500' :
                  d.overallRisk === 'Behind' ? 'border-l-yellow-500' :
                  d.overallRisk === 'At Risk' ? 'border-l-orange-500' : 'border-l-rose-500';

                return (
                  <button
                    key={d.name}
                    onClick={() => handleDistrictClick(d.name)}
                    className={`w-full text-left p-3.5 rounded-xl border-t border-r border-b transition-all duration-200 flex flex-col gap-2 border-l-4 ${riskColors} ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-zinc-100 shadow-sm shadow-emerald-500/5'
                        : 'bg-white/40 dark:bg-zinc-950/20 border-slate-200/50 dark:border-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900/40 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-xs flex items-center gap-2">
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold">#{index + 1}</span>
                        {d.name}
                      </span>
                      <RiskBadge level={d.overallRisk} className="text-[9px] px-1.5 py-0.2" />
                    </div>

                    {/* Attendance Bar */}
                    <div className="w-full mt-0.5">
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 mb-1">
                        <span>PBL Attendance</span>
                        <span className="font-bold text-slate-600 dark:text-zinc-400">{formatPercent(d.attendanceRate)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${d.attendanceRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Block Rankings List for selected district */}
        <div className="lg:col-span-4 premium-card p-5 h-[650px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-3">
            <MapPin className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-500" />
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest leading-none truncate max-w-[90%]">
              Blocks in {selectedDistrictName || 'District'}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {!selectedDistrictName ? (
              <div className="flex items-center justify-center h-full text-slate-450 text-xs font-semibold">Select a district to view blocks</div>
            ) : loadingBlocks ? (
              <div className="flex items-center justify-center h-full text-slate-450 text-xs font-semibold">Loading blocks...</div>
            ) : blocks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-450 text-xs font-semibold">No blocks found</div>
            ) : (
              blocks.map((b, index) => {
                const isSelected = selectedBlockName === b.name;
                const riskColors = 
                  b.overallRisk === 'On Track' ? 'border-l-emerald-500' :
                  b.overallRisk === 'Behind' ? 'border-l-yellow-500' :
                  b.overallRisk === 'At Risk' ? 'border-l-orange-500' : 'border-l-rose-500';

                return (
                  <button
                    key={b.name}
                    onClick={() => handleBlockClick(b.name)}
                    className={`w-full text-left p-3.5 rounded-xl border-t border-r border-b transition-all duration-200 flex flex-col gap-2 border-l-4 ${riskColors} ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-zinc-100 shadow-sm shadow-emerald-500/5'
                        : 'bg-white/40 dark:bg-zinc-950/20 border-slate-200/50 dark:border-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900/40 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-xs flex items-center gap-2">
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold">#{index + 1}</span>
                        {b.name}
                      </span>
                      <RiskBadge level={b.overallRisk} className="text-[9px] px-1.5 py-0.2" />
                    </div>

                    {/* Attendance Bar */}
                    <div className="w-full mt-0.5">
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 mb-1">
                        <span>PBL Attendance</span>
                        <span className="font-bold text-slate-600 dark:text-zinc-400">{formatPercent(b.attendanceRate)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${b.attendanceRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Risk Diagnosis Explanation Card */}
        <div className="lg:col-span-4 space-y-6">
          {selectedBlockName && activeBlockInfo ? (
            <RiskExplanation
              name={activeBlockInfo.name}
              type="block"
              participationRate={activeBlockInfo.participationRate}
              evidenceRate={activeBlockInfo.evidenceSubmissionRate}
              attendanceRate={activeBlockInfo.attendanceRate}
              overallRisk={activeBlockInfo.overallRisk}
              reason={activeBlockInfo.riskReason}
            />
          ) : selectedDistrictName && activeDistrictInfo ? (
            <RiskExplanation
              name={activeDistrictInfo.name}
              type="district"
              participationRate={activeDistrictInfo.participationRate}
              evidenceRate={activeDistrictInfo.evidenceSubmissionRate}
              attendanceRate={activeDistrictInfo.attendanceRate}
              overallRisk={activeDistrictInfo.overallRisk}
              reason={activeDistrictInfo.riskReason}
            />
          ) : (
            <div className="premium-card p-6 text-center text-slate-400 flex flex-col items-center justify-center min-h-[350px]">
              <HelpCircle className="w-10 h-10 mb-3 text-slate-300 dark:text-zinc-800" />
              <p className="text-xs font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">No Geography Selected</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-[200px] mt-1 leading-relaxed">Select a district or block from the lists to view risk diagnoses.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
