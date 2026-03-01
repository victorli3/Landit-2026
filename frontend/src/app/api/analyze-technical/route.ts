import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

    const modalUrl = process.env.MODAL_ANALYZE_TECHNICAL_URL;
    if (!modalUrl) {
      return NextResponse.json(
        { error: "MODAL_ANALYZE_TECHNICAL_URL is not configured" },
        { status: 500 }
      );
    }

    const modalResponse = await fetch(modalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
      cache: "no-store",
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error("[analyze-technical] Modal error:", modalResponse.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable", detail: errorText },
        { status: 502 }
      );
    }

    const parsed = await modalResponse.json();
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Technical analysis failed";
    console.error("[analyze-technical] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}