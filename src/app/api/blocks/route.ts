import { NextRequest, NextResponse } from 'next/server';
import { getBlockSummaries } from '@/lib/services/analytics';
import { z } from 'zod';

const BlocksQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
  district: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      month: searchParams.get('month') || undefined,
      district: searchParams.get('district') || undefined,
    };

    // 1. Validate inputs with Zod
    const validation = BlocksQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { month, district } = validation.data;

    // 2. Call service layer
    const blocks = getBlockSummaries(month, district);

    return NextResponse.json({ blocks });
  } catch (error: any) {
    console.error('[API Error] Blocks route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while loading block summaries' 
    }, { status: 500 });
  }
}
