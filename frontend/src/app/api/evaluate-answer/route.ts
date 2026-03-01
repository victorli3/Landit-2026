import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

let _openai: OpenAI | null = null;
function getClient() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are a senior interview coach evaluating a candidate's answer to a behavioral or role-specific interview question.

You will receive:
- The job description the candidate is targeting
- The interview question asked
- The candidate's answer

Score the answer on five dimensions (each 0-10 integer):
1. structure – Does the answer follow a clear framework (e.g. STAR)?
2. clarity – Is the answer easy to follow with no unnecessary jargon?
3. impact – Does the answer demonstrate measurable results or meaningful outcomes?
4. confidence – Does the answer sound assured and self-aware?
5. concision – Is the answer focused without unnecessary filler?

Also provide:
- overall: a single 0-10 integer score (weighted average of the five dimensions)
- suggestions: an array of 2-4 short, actionable coaching tips (strings)
- improvedSample: a rewritten version of the answer that would score higher, using STAR format. Keep it concise (4-6 sentences).

Return valid JSON matching this exact schema (no markdown, no extra keys):

{
  "overall": 7,
  "radar": {
    "structure": 6,
    "clarity": 8,
    "impact": 7,
    "confidence": 7,
    "concision": 8
  },
  "suggestions": [
    "Add specific metrics to demonstrate impact.",
    "Lead with the situation to set context faster."
  ],
  "improvedSample": "Situation: ... Action: ... Result: ..."
}`;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, question, answer } = (await req.json()) as {
      jobDescription: string;
      question: string;
      answer: string;
    };

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: "question and answer are required" },
        { status: 400 },
      );
    }

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `## Job Description\n${jobDescription}`,
            `## Question\n${question}`,
            `## Candidate's Answer\n${answer}`,
          ].join("\n\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    // Attach timestamp
    parsed.evaluatedAtIso = new Date().toISOString();

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Evaluation failed";
    console.error("[evaluate-answer] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
