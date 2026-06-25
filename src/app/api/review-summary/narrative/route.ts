import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { z } from 'zod';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const ReviewSummaryNarrativeBodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (expected YYYY-MM)'),
  facts: z.object({
    achievements: z.array(z.string()),
    gaps: z.array(z.string()),
    priorityGeographies: z.array(z.any()),
    discussionPrompts: z.array(z.string()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate inputs with Zod
    const validation = ReviewSummaryNarrativeBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid input parameters',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { month, facts } = validation.data;
    const { achievements, gaps, priorityGeographies, discussionPrompts } = facts;

    const factsText = `
Reporting Month: ${month}

Key Achievements:
${achievements.map((a: string) => `- ${a}`).join('\n')}

Gaps & Risks identified:
${gaps.map((g: string) => `- ${g}`).join('\n')}

Priority Geographies (Bottom Blocks by attendance):
${priorityGeographies.map((b: any) => `- Block: ${b.name} (${b.district}) | Attendance: ${(b.attendanceRate * 100).toFixed(1)}% | PBL Participation: ${(b.participationRate * 100).toFixed(1)}% | Overall: ${b.overallRisk}`).join('\n')}

Suggested Discussion Prompts:
${discussionPrompts.map((p: string) => `- ${p}`).join('\n')}
    `;

    // Try calling Groq API
    if (groq && process.env.GROQ_API_KEY) {
      try {
        const systemPrompt = `You are a professional Program Director for Mantra4Change.
Your task is to synthesize the provided monthly school implementation metrics into an executive program review summary.
This summary will be read by leadership before the monthly review meeting.
Rules:
1. Ground your writing strictly in the provided achievements, gaps, and priority blocks.
2. Do NOT invent location names, numbers, or progress details.
3. Write exactly 3 distinct paragraphs:
   - Paragraph 1: Strategic progress overview highlighting key accomplishments and districts performing well.
   - Paragraph 2: Direct critique of performance gaps and operational risks (focusing on low participation, lagging evidence, or low attendance).
   - Paragraph 3: Actionable meeting directive prioritizing where block/district managers must follow up and framing the discussion prompts for the review table.
4. Keep the tone executive, objective, and outcome-oriented.`;

        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the program review context:\n${factsText}` }
          ],
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          temperature: 0.3,
          max_tokens: 800,
        });

        const narrative = response.choices[0]?.message?.content;
        if (narrative) {
          return NextResponse.json({
            mode: 'AI-Generated (Groq)',
            narrative,
            sourceFacts: factsText
          });
        }
      } catch (apiError: any) {
        console.error('[API Error] Groq API call failed inside review summary narrative route, falling back to deterministic template:', apiError);
      }
    }

    // Fallback: Deterministic report summary
    const fallbackSummary = `### [Deterministic Mode] Executive Program Review: ${month}

**1. Implementation Status & Accomplishments**
In the ${month} reporting cycle, project-based learning (PBL) implementation showed notable accomplishments. Specifically, the following was recorded:
${achievements.map((a: string) => `- ${a}`).join('\n')}

**2. Key Operational Gaps & Risks**
Operational reviews have highlighted critical gaps in school implementation and reporting compliance:
${gaps.map((g: string) => `- ${g}`).join('\n')}
The program management team is currently staging interventions in these districts to address structural issues in evidence uploads and student attendance.

**3. Action Directives & Review Agenda**
For the upcoming monthly review meeting, focus is directed toward the following bottom-performing blocks:
${priorityGeographies.map((b: any) => `- Block **${b.name}** in **${b.district}** (Overall Status: **${b.overallRisk}**, attendance rate at ${(b.attendanceRate * 100).toFixed(1)}%).`).join('\n')}
The review board is requested to address the following prompts:
${discussionPrompts.map((p: string) => `- ${p}`).join('\n')}`;

    return NextResponse.json({
      mode: 'Deterministic Fallback',
      narrative: fallbackSummary,
      sourceFacts: factsText
    });

  } catch (error: any) {
    console.error('[API Error] Review summary narrative route failed:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred while generating the review narrative summary' 
    }, { status: 500 });
  }
}
