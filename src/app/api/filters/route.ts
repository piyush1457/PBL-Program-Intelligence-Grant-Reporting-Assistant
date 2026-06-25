import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get unique months
    const monthsResult = db.prepare('SELECT DISTINCT reporting_month FROM school_responses ORDER BY reporting_month DESC').all() as { reporting_month: string }[];
    const months = monthsResult.map(r => r.reporting_month);

    // Get all district-block mapping per month
    const hierarchyResult = db.prepare(`
      SELECT DISTINCT reporting_month, district, block 
      FROM school_responses 
      WHERE district IS NOT NULL AND block IS NOT NULL AND district != '' AND block != ''
      ORDER BY reporting_month DESC, district ASC, block ASC
    `).all() as { reporting_month: string; district: string; block: string }[];

    const hierarchy: Record<string, Record<string, string[]>> = {};

    hierarchyResult.forEach(row => {
      const m = row.reporting_month;
      const d = row.district;
      const b = row.block;

      if (!hierarchy[m]) {
        hierarchy[m] = {};
      }
      if (!hierarchy[m][d]) {
        hierarchy[m][d] = [];
      }
      if (!hierarchy[m][d].includes(b)) {
        hierarchy[m][d].push(b);
      }
    });

    return NextResponse.json({
      months,
      hierarchy,
      grades: ['6', '7', '8'],
      subjects: ['Math', 'Science', 'Math and Science']
    });
  } catch (error: any) {
    console.error('Error in /api/filters:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
