export type RiskLevel = 'On Track' | 'Behind' | 'At Risk' | 'Critical';

export function classifyRisk(rate: number): RiskLevel {
  if (rate >= 0.75) return 'On Track';
  if (rate >= 0.60) return 'Behind';
  if (rate >= 0.35) return 'At Risk';
  return 'Critical';
}

export function getRiskColorClass(level: RiskLevel): { bg: string; text: string; border: string; hex: string } {
  switch (level) {
    case 'On Track':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        border: 'border-emerald-500/20',
        hex: '#10b981',
      };
    case 'Behind':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20',
        hex: '#f59e0b',
      };
    case 'At Risk':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        border: 'border-orange-500/20',
        hex: '#f97316',
      };
    case 'Critical':
      default:
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-500',
        border: 'border-rose-500/20',
        hex: '#ef4444',
      };
  }
}

export function classifyGeography(
  participationRate: number,
  evidenceRate: number,
  attendanceRate: number
): {
  overallRisk: RiskLevel;
  participationRisk: RiskLevel;
  evidenceRisk: RiskLevel;
  attendanceRisk: RiskLevel;
  reason: string;
} {
  const pRisk = classifyRisk(participationRate);
  const eRisk = classifyRisk(evidenceRate);
  const aRisk = classifyRisk(attendanceRate);

  const riskOrder: RiskLevel[] = ['Critical', 'At Risk', 'Behind', 'On Track'];
  
  // Find the worst risk among the three
  let overallRisk: RiskLevel = 'On Track';
  for (const level of riskOrder) {
    if (pRisk === level || eRisk === level || aRisk === level) {
      overallRisk = level;
      break;
    }
  }

  // Create explanation reason
  const triggers: string[] = [];
  if (pRisk === overallRisk) triggers.push(`PBL participation rate (${(participationRate * 100).toFixed(1)}%)`);
  if (eRisk === overallRisk) triggers.push(`evidence submission rate (${(evidenceRate * 100).toFixed(1)}%)`);
  if (aRisk === overallRisk) triggers.push(`average PBL attendance rate (${(attendanceRate * 100).toFixed(1)}%)`);

  const reason = overallRisk === 'On Track'
    ? `All indicators are On Track (Participation: ${(participationRate * 100).toFixed(1)}%, Evidence: ${(evidenceRate * 100).toFixed(1)}%, Attendance: ${(attendanceRate * 100).toFixed(1)}%).`
    : `Classified as ${overallRisk} driven by ${triggers.join(' and ')}.`;

  return {
    overallRisk,
    participationRisk: pRisk,
    evidenceRisk: eRisk,
    attendanceRisk: aRisk,
    reason,
  };
}

export function formatMoMDelta(current: number, previous?: number): { text: string; direction: 'up' | 'down' | 'flat'; value: number } {
  if (previous === undefined || previous === null) {
    return { text: '--', direction: 'flat', value: 0 };
  }
  const delta = current - previous;
  const absDeltaPercent = Math.abs(delta * 100).toFixed(1);
  
  if (delta > 0.001) {
    return { text: `+${absDeltaPercent}%`, direction: 'up', value: delta };
  } else if (delta < -0.001) {
    return { text: `-${absDeltaPercent}%`, direction: 'down', value: delta };
  } else {
    return { text: '0.0%', direction: 'flat', value: 0 };
  }
}
