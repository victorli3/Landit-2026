import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ── Helpers ─────────────────────────────────────── */

type RawQuestion = {
  id?: string;
  text?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  targetScores?: Record<string, number>;
};

function normalizeCategory(
  category: string | undefined
): "Behavioral" | "Role/Skill" {
  if (!category) return "Role/Skill";
  const lower = category.toLowerCase();
  if (lower === "behavioral") return "Behavioral";
  return "Role/Skill";
}

function normalizeQuestions(data: unknown): RawQuestion[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { questions?: unknown[] }).questions)
  ) {
    return (data as { questions: RawQuestion[] }).questions;
  }
  return [];
}

/* ── Route ───────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = (await req.json()) as {
      jobDescription: string;
    };

    if (!jobDescription?.trim()) {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 }
      );
    }

    const modalGenerateUrl = process.env.MODAL_GENERATE_URL;
    if (!modalGenerateUrl) {
      return NextResponse.json(
        { error: "MODAL_GENERATE_URL is not configured" },
        { status: 500 }
      );
    }

    /* ── Forward to Modal ── */
    const modalResponse = await fetch(modalGenerateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription,
        questionCount: 8,
        categories: ["Behavioral", "Situational", "Role-Specific"],
      }),
      cache: "no-store",
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error("[generate-questions] Modal error:", modalResponse.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable", detail: errorText },
        { status: 502 }
      );
    }

    /* ── Normalize Modal response into frontend shape ── */
    const data = await modalResponse.json();
    const raw = normalizeQuestions(data);

    const questions = raw
      .filter((q) => typeof q?.text === "string" && q.text.trim().length > 0)
      .map((q, i) => ({
        id: q.id ?? `q_${Date.now()}_${i}`,
        text: q.text ?? "",
        category: normalizeCategory(q.category),
        tags: Array.isArray(q.tags) ? q.tags.slice(0, 6) : [],
      }));

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Question generation failed";
    console.error("[generate-questions] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}