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

const SYSTEM_PROMPT = `You are an expert technical interview advisor. Given a job description, determine whether the role involves a traditional algorithmic/LeetCode-style coding interview.

Analyze the job description and return valid JSON matching this exact schema (no markdown, no extra keys):

{
  "hasTechnical": true,
  "summary": "A 3-5 sentence overview of what to expect...",
  "leetcodeQuestions": [
    {
      "title": "Two Sum",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/two-sum/"
    }
  ],
  "preparationTips": ["tip1", "tip2"]
}

Rules:
- Set hasTechnical to true if the role likely includes algorithmic coding rounds (software engineer, SWE, developer, etc.)
- Set hasTechnical to false for non-engineering roles or roles that assess technically through other means.

If hasTechnical is true:
- summary: describe the expected interview format (live coding, system design, etc.)
- leetcodeQuestions: recommend 5-7 specific LeetCode problems relevant to the role's domain. Include the exact LeetCode URL. Use difficulties "Easy", "Medium", or "Hard".
- preparationTips: omit or set to empty array.

If hasTechnical is false:
- summary: explain what alternative assessment to expect instead.
- leetcodeQuestions: set to empty array [].
- preparationTips: provide 3-4 actionable tips for non-algorithmic preparation.`;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = (await req.json()) as {
      jobDescription: string;
    };

    if (!jobDescription?.trim()) {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 },
      );
    }

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the job description:\n\n${jobDescription}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Technical analysis failed";
    console.error("[analyze-technical] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
