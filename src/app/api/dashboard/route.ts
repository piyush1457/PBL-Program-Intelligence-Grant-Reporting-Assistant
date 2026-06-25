import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedMetrics, QueryFilters } from '@/lib/services/analytics';
import { getPrevMonth } from '@/lib/utils';
import { z } from 'zod';

const DashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
  district: z.string().optional(),
  block: z.string().optional(),
  grade: z.enum(['6', '7', '8']).optional(),
  subject: z.enum(['Math', 'Science', 'Math and Science']).optional(),
});

function getTrendMonths(month: string): string[] {
  const prev1 = getPrevMonth(month);
  if (!prev1) return [month];
  const prev2 = getPrevMonth(prev1);
  if (!prev2) return [prev1, month];
  return [prev2, prev1, month];
}

function getMonthLabel(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const monthInt = parseInt(parts[1], 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (monthInt >= 1 && monthInt <= 12) {
    return monthNames[monthInt - 1];
  }
  return monthStr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      month: searchParams.get('month') || undefined,
      district: searchParams.get('district') || undefined,
      block: searchParams.get('block') || undefined,
      grade: searchParams.get('grade') || undefined,
      subject: searchParams.get('subject') || undefined,
    };

    // 1. Validate query inputs with Zod
    const validation = DashboardQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const filters: QueryFilters = validation.data;

    // 2. Call service layer
    const currentMetrics = getAggregatedMetrics(filters);

    let prevMetrics = null;
    const prevMonth = getPrevMonth(filters.month);
    if (prevMonth) {
      prevMetrics = getAggregatedMetrics({ ...filters, month: prevMonth });
    }

    // 3. Generate dynamic trend months based on inputs
    const trendMonths = getTrendMonths(filters.month);
    const trendData = trendMonths.map(m => {
      const metrics = getAggregatedMetrics({ ...filters, month: m });
      return {
        month: m,
        monthLabel: getMonthLabel(m),
        participationRate: metrics.participationPercentage * 100,
        evidenceRate: metrics.evidenceSubmissionPercentage * 100,
        attendanceRate: metrics.attendancePercentage * 100,
        ...metrics.riskDistribution
      };
    });

    return NextResponse.json({
      current: currentMetrics,
      previous: prevMetrics,
      trend: trendData
    });
  } catch (error: any) {
    // 4. Safe user-friendly errors, logging the detailed stack only on server
    console.error('[API Error] Dashboard route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while processing metrics' 
    }, { status: 500 });
  }
}
