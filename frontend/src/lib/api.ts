import type {
  EvaluationResult,
  QuestionBlock,
  TechnicalAnalysis,
} from "@/types/interviewos";

/* ── Generate interview questions ─────────────────── */

export async function generateQuestions(
  jobDescription: string,
): Promise<QuestionBlock[]> {
  const res = await fetch("/api/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Generate questions failed (${res.status})`);
  }

  const data = (await res.json()) as { questions: QuestionBlock[] };
  return data.questions;
}

/* ── Evaluate an answer ───────────────────────────── */

export async function evaluateAnswer(args: {
  jobDescription: string;
  question: string;
  answer: string;
}): Promise<EvaluationResult> {
  const res = await fetch("/api/evaluate-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Evaluation failed (${res.status})`);
  }

  return (await res.json()) as EvaluationResult;
}

/* ── Analyze technical interview expectations ─────── */

export async function analyzeTechnical(
  jobDescription: string,
): Promise<TechnicalAnalysis> {
  const res = await fetch("/api/analyze-technical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Technical analysis failed (${res.status})`);
  }

  return (await res.json()) as TechnicalAnalysis;
}
