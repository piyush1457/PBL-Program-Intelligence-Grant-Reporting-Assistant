import { NextRequest, NextResponse } from 'next/server';
import { getDistrictSummaries } from '@/lib/services/analytics';
import { z } from 'zod';

const DistrictQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      month: searchParams.get('month') || undefined,
    };

    // 1. Input Validation with Zod
    const validation = DistrictQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { month } = validation.data;

    // 2. Call service layer
    const districts = getDistrictSummaries(month);

    return NextResponse.json({ districts });
  } catch (error: any) {
    console.error('[API Error] Districts route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while loading district summaries' 
    }, { status: 500 });
  }
}
