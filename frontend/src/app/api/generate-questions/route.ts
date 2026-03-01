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

const SYSTEM_PROMPT = `You are an expert interview coach. Given a job description, generate exactly 8 tailored interview questions: 5 behavioral and 3 role/skill-specific.

Return valid JSON matching this exact schema (no markdown, no extra keys):

{
  "questions": [
    {
      "id": "b1",
      "category": "Behavioral",
      "text": "...",
      "tags": ["tag1", "tag2"]
    },
    {
      "id": "r1",
      "category": "Role/Skill",
      "text": "...",
      "tags": ["tag1"]
    }
  ]
}

Rules:
- Behavioral questions (ids b1-b5): ask about past experiences using STAR-style prompts. Cover themes like conflict resolution, ownership, failure, deadlines, and teamwork.
- Role/Skill questions (ids r1-r3): target specific skills, tools, or competencies mentioned in the job description.
- Each question must have 1-3 short lowercase tags derived from the job description keywords.
- Questions should be specific enough to prepare for THIS role, not generic.
- Keep question text concise (1-2 sentences).`;

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
      temperature: 0.7,
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
    const parsed = JSON.parse(raw) as { questions: unknown[] };

    return NextResponse.json({ questions: parsed.questions ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Question generation failed";
    console.error("[generate-questions] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
