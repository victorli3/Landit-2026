import type { EvaluationResult, QuestionBlock, TechnicalAnalysis } from "@/types/interviewos";
import { mockEvaluateAnswer, mockGenerateQuestions } from "@/lib/mockAi";

const API_BASE = "/api"; // Next.js API routes, same-origin

// ─── Errors ───

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || errorBody.error;
    } catch {
      detail = await response.text();
    }
    throw new ApiError(
      detail || `Request failed with status ${response.status}`,
      response.status,
      detail
    );
  }
  return response.json();
}

// ─── Question Generation ───

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export async function generateQuestions(
  jobDescription: string,
  questionCount: number = 8
): Promise<QuestionBlock[]> {
  if (USE_MOCKS) return mockGenerateQuestions(jobDescription);

  const response = await fetch(`${API_BASE}/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription, questionCount }),
  });

  const data = await handleResponse<{ questions: QuestionBlock[] }>(response);
  return data.questions;
}

// ─── Answer Evaluation ───

export async function evaluateAnswer(args: {
  jobDescription: string;
  questionId?: string;
  category?: string;
  question: string;
  answer: string;
}): Promise<EvaluationResult> {
  if (USE_MOCKS) return mockEvaluateAnswer(args);

  const response = await fetch(`${API_BASE}/evaluate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return handleResponse<EvaluationResult>(response);
}

// ─── Speech Transcription (Whisper on Modal GPU) ───

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(audioBlob);
  });

  const format = audioBlob.type.includes("webm")
    ? "webm"
    : audioBlob.type.includes("mp4")
      ? "mp4"
      : "wav";

  const response = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64, format }),
  });

  const data = await handleResponse<{ text: string }>(response);
  return data.text;
}

// ─── Technical Interview Analysis ───

export async function analyzeTechnical(
  jobDescription: string
): Promise<TechnicalAnalysis> {
  const response = await fetch(`${API_BASE}/analyze-technical`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription }),
  });
  return handleResponse<TechnicalAnalysis>(response);
}