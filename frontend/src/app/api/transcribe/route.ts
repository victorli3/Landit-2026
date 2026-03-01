import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const audio = body.audio;
    const format = body.format ?? "webm";

    if (!audio || typeof audio !== "string") {
      return NextResponse.json(
        { error: "audio is required and must be a base64-encoded string" },
        { status: 400 }
      );
    }

    const modalTranscribeUrl = process.env.MODAL_TRANSCRIBE_URL;
    if (!modalTranscribeUrl) {
      return NextResponse.json(
        { error: "MODAL_TRANSCRIBE_URL is not configured" },
        { status: 500 }
      );
    }

    const modalResponse = await fetch(modalTranscribeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio, format }),
      cache: "no-store",
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error("Modal transcribe error:", modalResponse.status, errorText);
      return NextResponse.json(
        { error: "Transcription service unavailable", detail: errorText },
        { status: 502 }
      );
    }

    const data = await modalResponse.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: data.text ?? "" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Transcribe error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 }
    );
  }
}