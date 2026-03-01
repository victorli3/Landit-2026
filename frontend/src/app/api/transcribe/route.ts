import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// Lazy-init so the build doesn't throw when OPENAI_API_KEY is absent.
let _openai: OpenAI | null = null;
function getClient() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio");

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Convert the Blob into a File the SDK accepts.
    const file = new File([audioBlob], "recording.webm", {
      type: audioBlob.type || "audio/webm",
    });

    const transcription = await getClient().audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "en",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Transcription failed";
    console.error("[whisper] transcription error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
