'use client';

import { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { formatMonthName } from '@/lib/utils';

export interface FilterState {
  month: string;
  district: string;
  block: string;
  grade: string;
  subject: string;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  showGeoFilters?: boolean;
}

export default function FilterBar({ onFilterChange, showGeoFilters = true }: FilterBarProps) {
  const [months, setMonths] = useState<string[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, Record<string, string[]>>>({});
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Current selected state
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Fetch filter metadata on mount
  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch('/api/filters');
        if (!res.ok) throw new Error('Failed to fetch filters metadata');
        const data = await res.json();
        
        setMonths(data.months);
        setHierarchy(data.hierarchy);
        setGrades(data.grades);
        setSubjects(data.subjects);

        // Set initial state defaults
        if (data.months && data.months.length > 0) {
          // Default to latest month (usually September 2025)
          const defaultMonth = data.months[0];
          setSelectedMonth(defaultMonth);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading filters metadata:', err);
      }
    }
    fetchFilters();
  }, []);

  // Update selected values when data finishes loading
  useEffect(() => {
    if (selectedMonth) {
      triggerFilterChange();
    }
  }, [selectedMonth, selectedDistrict, selectedBlock, selectedGrade, selectedSubject]);

  const triggerFilterChange = () => {
    onFilterChange({
      month: selectedMonth,
      district: selectedDistrict,
      block: selectedBlock,
      grade: selectedGrade === 'All' ? '' : selectedGrade,
      subject: selectedSubject === 'All' ? '' : selectedSubject,
    });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    setSelectedDistrict('');
    setSelectedBlock('');
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
    setSelectedBlock('');
  };

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBlock(e.target.value);
  };

  const handleReset = () => {
    setSelectedDistrict('');
    setSelectedBlock('');
    setSelectedGrade('All');
    setSelectedSubject('All');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 animate-pulse flex space-x-4">
        <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg w-32"></div>
        <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg w-40"></div>
        <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg w-40"></div>
        <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg w-24"></div>
      </div>
    );
  }

  // Get districts available for selected month
  const availableDistricts = selectedMonth && hierarchy[selectedMonth] 
    ? Object.keys(hierarchy[selectedMonth]).sort() 
    : [];

  // Get blocks available for selected month and district
  const availableBlocks = selectedMonth && selectedDistrict && hierarchy[selectedMonth] && hierarchy[selectedMonth][selectedDistrict]
    ? hierarchy[selectedMonth][selectedDistrict].sort()
    : [];

  return (
    <div className="sticky top-0 z-20 glass-panel px-6 py-4 rounded-2xl mb-8 flex flex-wrap items-center gap-4 transition-all duration-300 border border-slate-200/60 dark:border-zinc-900/60 shadow-sm shadow-slate-100/50 dark:shadow-none">
      <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-200 font-bold text-xs mr-2 border-r border-slate-200/60 dark:border-zinc-800 pr-4 h-7 shrink-0">
        <Filter className="w-4 h-4 text-emerald-500 dark:text-emerald-500" />
        <span>Filters</span>
      </div>

      {/* Month Selector */}
      <div className="flex flex-col gap-1 shrink-0">
        <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-400 tracking-wider">Reporting Month</label>
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          aria-label="Reporting Month"
          className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-slate-700 dark:text-zinc-300 min-w-[130px] cursor-pointer custom-select transition-all hover:border-slate-300 dark:hover:border-zinc-700"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {formatMonthName(m)}
            </option>
          ))}
        </select>
      </div>

      {showGeoFilters && (
        <>
          {/* District Selector */}
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-400 tracking-wider">District</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              aria-label="District Filter"
              className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-slate-700 dark:text-zinc-300 min-w-[160px] cursor-pointer custom-select transition-all hover:border-slate-300 dark:hover:border-zinc-700"
            >
              <option value="">All Districts</option>
              {availableDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Block Selector */}
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-400 tracking-wider">Block</label>
            <select
              value={selectedBlock}
              onChange={handleBlockChange}
              disabled={!selectedDistrict}
              aria-label="Block Filter"
              className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-slate-700 dark:text-zinc-300 min-w-[160px] cursor-pointer custom-select transition-all hover:border-slate-300 dark:hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Blocks</option>
              {availableBlocks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Grade Selector */}
      <div className="flex flex-col gap-1 shrink-0">
        <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-400 tracking-wider">Grade</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          aria-label="Grade Filter"
          className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-slate-700 dark:text-zinc-300 min-w-[100px] cursor-pointer custom-select transition-all hover:border-slate-300 dark:hover:border-zinc-700"
        >
          <option value="All">All Grades</option>
          {grades.map(g => (
            <option key={g} value={g}>Class {g}</option>
          ))}
        </select>
      </div>

      {/* Subject Selector */}
      <div className="flex flex-col gap-1 shrink-0">
        <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-zinc-400 tracking-wider">Subject</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          aria-label="Subject Filter"
          className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-slate-700 dark:text-zinc-300 min-w-[140px] cursor-pointer custom-select transition-all hover:border-slate-300 dark:hover:border-zinc-700"
        >
          <option value="All">All Subjects</option>
          <option value="Math">Mathematics</option>
          <option value="Science">Science</option>
        </select>
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        title="Reset filters"
        aria-label="Reset filters"
        className="ml-auto mt-4 sm:mt-0 flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-450 hover:bg-slate-50 dark:hover:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
