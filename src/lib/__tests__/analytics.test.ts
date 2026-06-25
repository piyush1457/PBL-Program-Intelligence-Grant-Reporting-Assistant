import { describe, it, expect } from 'vitest';
import { mapToGeographySummary } from '../services/analytics';
import { getPrevMonth, formatMonthName } from '../utils';

describe('Analytics Calculations — mapToGeographySummary', () => {
  it('should correctly calculate participation, evidence, and attendance rates', () => {
    // Mock row structure:
    // total_schools: 10
    // participating_schools: 8 (participationRate = 0.8)
    // evidence_submitted_schools: 4 (evidenceSubmissionRate = 0.5)
    // total_enrollment: 100
    // total_attendance: 120 (possibleAttendance = 100 * 2 = 200, attendanceRate = 120/200 = 0.6)
    const mockRow = {
      name: 'District Test',
      total_schools: 10,
      participating_schools: 8,
      evidence_submitted_schools: 4,
      total_enrollment: 100,
      total_attendance: 120
    };

    const summary = mapToGeographySummary(mockRow, 'district');

    expect(summary.name).toBe('District Test');
    expect(summary.type).toBe('district');
    expect(summary.participationRate).toBe(0.8);
    expect(summary.evidenceSubmissionRate).toBe(0.5);
    expect(summary.attendanceRate).toBe(0.6);
    // Worst-of-three check:
    // participationRate = 0.8 => On Track
    // evidenceSubmissionRate = 0.5 => At Risk
    // attendanceRate = 0.6 => Behind
    // Worst is At Risk:
    expect(summary.overallRisk).toBe('At Risk');
  });

  it('should handle zero schools or enrollment without division by zero errors', () => {
    const mockRow = {
      name: 'Empty Block',
      total_schools: 0,
      participating_schools: 0,
      evidence_submitted_schools: 0,
      total_enrollment: 0,
      total_attendance: 0
    };

    const summary = mapToGeographySummary(mockRow, 'block');

    expect(summary.participationRate).toBe(0);
    expect(summary.evidenceSubmissionRate).toBe(0);
    expect(summary.attendanceRate).toBe(0);
    expect(summary.overallRisk).toBe('Critical'); // zero rates classified as critical
  });
});

describe('Date Utilities — getPrevMonth', () => {
  it('should calculate the previous month correctly in same year', () => {
    expect(getPrevMonth('2025-08')).toBe('2025-07');
    expect(getPrevMonth('2025-12')).toBe('2025-11');
    expect(getPrevMonth('2025-10')).toBe('2025-09');
  });

  it('should wrap around to December of the previous year', () => {
    expect(getPrevMonth('2025-01')).toBe('2024-12');
    expect(getPrevMonth('2026-01')).toBe('2025-12');
  });

  it('should return null for invalid formats', () => {
    expect(getPrevMonth('2025')).toBeNull();
    expect(getPrevMonth('invalid-date')).toBeNull();
  });
});

describe('Date Utilities — formatMonthName', () => {
  it('should format valid YYYY-MM strings correctly', () => {
    expect(formatMonthName('2025-07')).toBe('July 2025');
    expect(formatMonthName('2025-08')).toBe('August 2025');
    expect(formatMonthName('2025-09')).toBe('September 2025');
    expect(formatMonthName('2026-12')).toBe('December 2026');
  });

  it('should fallback to input string for invalid formats or values', () => {
    expect(formatMonthName('')).toBe('');
    expect(formatMonthName('2025')).toBe('2025');
    expect(formatMonthName('invalid-date')).toBe('invalid-date');
    expect(formatMonthName('2025-13')).toBe('2025-13');
  });
});
