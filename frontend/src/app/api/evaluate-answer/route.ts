import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ── Score helpers ───────────────────────────────── */

function clamp0to10(n: number) {
  return Math.max(0, Math.min(10, n));
}

/** Modal returns 0-100, frontend expects 0-10 */
function fromPct(pct: number | undefined) {
  if (typeof pct !== "number" || Number.isNaN(pct)) return 0;
  return clamp0to10(Number((pct / 10).toFixed(1)));
}

/* ── Route ───────────────────────────────────────── */

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
        { status: 400 }
      );
    }

    const modalEvaluateUrl = process.env.MODAL_EVALUATE_URL;
    if (!modalEvaluateUrl) {
      return NextResponse.json(
        { error: "MODAL_EVALUATE_URL is not configured" },
        { status: 500 }
      );
    }

    /* ── Build the payload Modal expects ── */
    const questionPayload = {
      id: `q_${Date.now()}`,
      text: question,
      category: "Behavioral",
      difficulty: "Medium" as const,
      targetScores: {
        relevance: 75,
        depth: 75,
        clarity: 75,
        impact: 75,
        consistency: 75,
      },
    };

    const modalResponse = await fetch(modalEvaluateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: questionPayload,
        answer,
        jobDescription: jobDescription ?? "",
      }),
      cache: "no-store",
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error("[evaluate-answer] Modal error:", modalResponse.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable", detail: errorText },
        { status: 502 }
      );
    }

    /* ── Adapt Modal's 0-100 response into frontend's 0-10 shape ── */
    const data = await modalResponse.json();
    const evalData = (data?.evaluation ?? data) as {
      scores?: Record<string, number>;
      suggestions?: string[];
      improvedAnswer?: string;
    };
    const scores = evalData?.scores ?? {};

    const structure = fromPct(scores.depth);
    const clarity = fromPct(scores.clarity);
    const impact = fromPct(scores.impact);
    const confidence = fromPct(scores.relevance);
    const concision = fromPct(scores.consistency);

    const overall = clamp0to10(
      Number(((structure + clarity + impact + confidence + concision) / 5).toFixed(1))
    );

    const result = {
      overall,
      radar: { structure, clarity, impact, confidence, concision },
      suggestions: Array.isArray(evalData.suggestions)
        ? evalData.suggestions.slice(0, 5)
        : ["Try adding more specific details and measurable outcomes."],
      improvedSample:
        typeof evalData.improvedAnswer === "string" && evalData.improvedAnswer.trim()
          ? evalData.improvedAnswer
          : "No improved sample returned by the AI service.",
      evaluatedAtIso: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Evaluation failed";
    console.error("[evaluate-answer] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}