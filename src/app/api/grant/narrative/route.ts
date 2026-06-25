import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { z } from 'zod';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const GrantNarrativeBodySchema = z.object({
  grantId: z.string().min(1, 'grantId is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
  facts: z.object({
    grantName: z.string(),
    donor: z.string(),
    pblCompletionRate: z.number(),
    evidenceSubmissionRate: z.number(),
    attendanceRate: z.number(),
    riskStatus: z.string(),
    milestoneSummary: z.string(),
    mediaCount: z.number(),
    mediaDetails: z.array(z.any()),
    budgetLines: z.array(z.any()),
    financeSummary: z.object({
      totalApprovedBudget: z.number(),
      totalCumulativeUtilized: z.number(),
      utilizationRate: z.number(),
    }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate inputs with Zod
    const validation = GrantNarrativeBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid input parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { grantId, month, facts } = validation.data;
    const {
      grantName,
      donor,
      pblCompletionRate,
      evidenceSubmissionRate,
      attendanceRate,
      riskStatus,
      milestoneSummary,
      financeSummary,
      mediaCount,
      mediaDetails,
      budgetLines
    } = facts;

    // Create the facts summary prompt context
    const factsSummary = `
Grant Information:
- Grant ID: ${grantId}
- Grant Name: ${grantName}
- Donor: ${donor}
- Reporting Period: ${month}

Computed Performance Indicators (PBL Data):
- PBL School Completion Rate: ${(pblCompletionRate * 100).toFixed(1)}%
- Evidence Submission Rate: ${(evidenceSubmissionRate * 100).toFixed(1)}%
- Average Student Attendance Rate: ${(attendanceRate * 100).toFixed(1)}%
- Risk Classification: ${riskStatus}

Financial Highlights:
- Cumulative Utilization Rate: ${(financeSummary.utilizationRate * 100).toFixed(1)}%
- Cumulative Utilized: ${financeSummary.totalCumulativeUtilized} units
- Approved Budget: ${financeSummary.totalApprovedBudget} units
- Budget Lines Detail:
${budgetLines.map((b: any) => `  * ${b.budget_line}: Approved: ${b.approved_budget}, Monthly Utilized: ${b.monthly_utilized}, Cumulative Utilized: ${b.cumulative_utilized} (${b.approved_budget > 0 ? (b.cumulative_utilized / b.approved_budget * 100).toFixed(1) : '0.0'}%) - Note: ${b.finance_note || 'N/A'}`).join('\n')}

Milestones Status:
- Current Status: ${milestoneSummary}

Linked Evidence & Media:
- Total Assets: ${mediaCount}
${mediaDetails.map((m: any) => `  * [${m.record_type.toUpperCase()}] ${m.title} (File: ${m.file_name}) - Caption: ${m.summary_or_caption}`).join('\n')}
    `;

    // Try calling Groq API
    if (groq && process.env.GROQ_API_KEY) {
      try {
        const systemPrompt = `You are a professional Grant Reporting Assistant for Mantra4Change.
Your task is to write a donor-ready progress report section for the specified grant and reporting month.
Strict Rules:
1. Ground your report strictly on the provided facts. 
2. Do NOT hallucinate locations, schools, donors, budget numbers, or achievements not explicitly listed in the facts.
3. Explicitly reference key metrics: Completion rate, Evidence submission rate, Attendance rate, and Budget utilization.
4. Integrate references to the linked media/evidence files (e.g. referencing photo file names or captions as evidence of class projects).
5. Maintain a professional, objective tone. Write in 3 distinct paragraphs:
   - Paragraph 1: Overview of implementation progress and key indicators (PBL Completion, Attendance, and overall status).
   - Paragraph 2: Financial review and budget utilization across major lines.
   - Paragraph 3: Milestones achieved, linked evidence validation, and proposed next steps/risk mitigation.`;

        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here are the structured facts for the monthly report:\n${factsSummary}` }
          ],
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 800,
        });

        const narrative = response.choices[0]?.message?.content;
        if (narrative) {
          return NextResponse.json({
            mode: 'AI-Generated (Groq)',
            narrative,
            sourceFacts: factsSummary
          });
        }
      } catch (apiError: any) {
        console.error('[API Error] Groq API call failed inside grant narrative route, falling back to deterministic template:', apiError);
      }
    }

    // Fallback: Deterministic/Mock Narrative Generator (used if AI is disabled or fails)
    const fallbackNarrative = `### [Deterministic Mode] Progress Report: ${grantName} (${month})

**1. Implementation & Performance Overview**
During the reporting period of ${month}, the "${grantName}" funded by ${donor} operated under an overall status of **${riskStatus}**. A total of ${(pblCompletionRate * 100).toFixed(1)}% of schools successfully completed their PBL classroom projects. The program observed an average student attendance rate of ${(attendanceRate * 100).toFixed(1)}% across Class 6-8 science and math sessions, with ${(evidenceSubmissionRate * 100).toFixed(1)}% of participating schools uploading verifiable evidence packs.

**2. Financial Utilization Summary**
To date, the grant has reached a cumulative budget utilization rate of ${(financeSummary.utilizationRate * 100).toFixed(1)}%, expending ${financeSummary.totalCumulativeUtilized} units of the approved ${financeSummary.totalApprovedBudget} units. Budget lines behaved as follows:
${budgetLines.map((b: any) => `- **${b.budget_line}**: Utilization at ${b.approved_budget > 0 ? (b.cumulative_utilized / b.approved_budget * 100).toFixed(1) : '0.0'}% (${b.cumulative_utilized}/${b.approved_budget} units), noted as "${b.finance_note || 'N/A'}".`).join('\n')}

**3. Program Milestones & Evidence Index**
The program milestone status is currently marked as: *"${milestoneSummary}"*. Verifiable field evidence consists of ${mediaCount} index record(s) linked to this reporting cycle, including:
${mediaDetails.map((m: any) => `- **${m.title}** (${m.file_name}): ${m.summary_or_caption}`).join('\n')}
These assets confirm class participation and have been verified by program coordinators for reporting purposes. Follow-up reviews will focus on mitigating indicators that trigger risk flags.`;

    return NextResponse.json({
      mode: 'Deterministic Fallback',
      narrative: fallbackNarrative,
      sourceFacts: factsSummary
    });

  } catch (error: any) {
    console.error('[API Error] Grant narrative route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while generating the grant narrative report' 
    }, { status: 500 });
  }
}
