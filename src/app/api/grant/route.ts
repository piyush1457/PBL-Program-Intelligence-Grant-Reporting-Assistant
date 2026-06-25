import { NextRequest, NextResponse } from 'next/server';
import { getGrantDetails } from '@/lib/services/analytics';
import { z } from 'zod';

const GrantQuerySchema = z.object({
  grantId: z.string().min(1, 'grantId is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      grantId: searchParams.get('grantId') || undefined,
      month: searchParams.get('month') || undefined,
    };

    // 1. Validate query parameters using Zod
    const validation = GrantQuerySchema.safeParse(rawParams);
    
    // In the frontend dropdowns load, we might send default mock variables first.
    // If the validation fails, check if we have any fallback dropdown values lists we can load
    // to keep the frontend running robustly without crashes.
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { grantId, month } = validation.data;

    // 2. Call service layer
    const grantDetails = getGrantDetails(grantId, month);

    if (!grantDetails.performance && grantDetails.finance.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected grant and month',
        grantsList: grantDetails.grantsList
      }, { status: 404 });
    }

    return NextResponse.json(grantDetails);
  } catch (error: any) {
    console.error('[API Error] Grant details route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while retrieving grant details' 
    }, { status: 500 });
  }
}
