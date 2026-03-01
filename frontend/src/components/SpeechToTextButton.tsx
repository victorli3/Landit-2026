"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  /** Called with the full transcribed text when recording stops. */
  onText: (text: string) => void;
};

/* ── helpers ─────────────────────────────────── */

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── component ───────────────────────────────── */

/**
 * Record → Stop → Transcribe (OpenAI Whisper).
 *
 * Uses MediaRecorder to capture audio, then sends it to
 * /api/transcribe which calls Whisper. No Web Speech API.
 */
export function SpeechToTextButton({ onText }: Props) {
  const [status, setStatus] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Timer management ────────────────────────── */

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1_000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount / navigation.
  useEffect(() => {
    return () => {
      stopTimer();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopTimer]);

  /* ── Start recording ─────────────────────────── */

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopTimer();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size === 0) {
          setStatus("idle");
          return;
        }

        setStatus("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(
              `[STT] server responded ${res.status} — ${body.slice(0, 200) || "(empty body)"}`,
            );
            setStatus("idle");
            return;
          }

          const { text } = (await res.json()) as { text: string };
          if (text?.trim()) {
            onText(text.trim());
          }
        } catch (err) {
          console.error("[STT] network error:", err);
        } finally {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      startTimer();
      setStatus("recording");
    } catch (err) {
      console.error("[STT] mic access denied:", err);
      setError("Mic access denied");
      setStatus("idle");
      // Auto-dismiss error after 3s
      setTimeout(() => setError(null), 3_000);
    }
  }, [onText, startTimer, stopTimer]);

  /* ── Stop recording (triggers onstop → transcribe) ── */

  const stop = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /* ── Render ──────────────────────────────────── */

  const isRecording = status === "recording";

  return (
    <div className="flex items-center gap-3">
      {/* ── Error toast ─────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>

      {/* ── Transcribing state ──────────────── */}
      {status === "transcribing" && (
        <span className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm text-muted">
          <Spinner /> Transcribing…
        </span>
      )}

      {/* ── Idle / Recording button ─────────── */}
      {status !== "transcribing" && (
        <>
          <motion.button
            type="button"
            onClick={isRecording ? stop : start}
            /* micro-bounce on recording start */
            animate={
              isRecording
                ? { scale: [1, 1.04, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={
              isRecording
                ? "stt-btn-active relative inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                : "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            }
          >
            {/* Pulsing glow ring (recording only) */}
            {isRecording && (
              <span className="stt-glow-ring" aria-hidden="true" />
            )}

            {/* Icon */}
            {isRecording ? <MicOnIcon /> : <MicOffIcon />}

            {/* Label */}
            {isRecording ? "Stop recording" : "Record answer"}
          </motion.button>

          {/* ── Timer + pulse dot (recording) ── */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                {/* Pulsing recording dot */}
                <motion.span
                  animate={{
                    scale: [1, 1.35, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-block h-2 w-2 rounded-full bg-red-400"
                  aria-hidden="true"
                />

                {/* mm:ss timer */}
                <span className="tabular-nums text-sm font-semibold text-red-400 select-none whitespace-nowrap">
                  {fmtTime(elapsed)}
                </span>

                {/* Animated equalizer bars */}
                <div className="flex items-end gap-[2px] h-3.5 ml-1" aria-hidden="true">
                  {[0, 0.15, 0.3].map((delay) => (
                    <motion.div
                      key={delay}
                      className="w-[3px] rounded-sm bg-red-400/70"
                      animate={{ height: ["30%", "100%", "50%", "80%", "30%"] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ── sub-components ──────────────────────────── */

function MicOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOnIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2" />
      <line x1="12" x2="12" y1="19" y2="22" fill="none" strokeWidth="2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-muted"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
