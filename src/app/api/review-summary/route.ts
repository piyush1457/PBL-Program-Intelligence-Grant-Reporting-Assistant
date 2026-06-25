import { NextRequest, NextResponse } from 'next/server';
import { getReviewSummary } from '@/lib/services/analytics';
import { z } from 'zod';

const ReviewSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      month: searchParams.get('month') || undefined,
    };

    // 1. Validate inputs with Zod
    const validation = ReviewSummaryQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { month } = validation.data;

    // 2. Call service layer
    const summary = getReviewSummary(month);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[API Error] Review Summary route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while generating the review summary' 
    }, { status: 500 });
  }
}
