"use client";

import { useCallback, useRef } from "react";
import type { QuestionBlock } from "@/types/interviewos";
import { SpeechToTextButton } from "./SpeechToTextButton";

type Props = {
  selected: QuestionBlock | null;
  answer: string;
  onChangeAnswer: (text: string) => void;
  onEvaluate: () => Promise<void> | void;
  evaluating: boolean;
};

export function AnswerPanel({
  selected,
  answer,
  onChangeAnswer,
  onEvaluate,
  evaluating,
}: Props) {
  const canEvaluate = answer.trim().length >= 30;

  /*
   * Keep a ref to the latest answer so the speech callback
   * always appends to the current text, never a stale closure.
   */
  const answerRef = useRef(answer);
  answerRef.current = answer;

  const handleSpeechText = useCallback(
    (finalText: string) => {
      const prev = answerRef.current;
      const spacer = prev.trim().length ? " " : "";
      const next = prev + spacer + finalText;
      answerRef.current = next;        // sync update for rapid back-to-back calls
      onChangeAnswer(next);
    },
    [onChangeAnswer],
  );

  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h2 className="text-sm font-semibold text-foreground">
        3) Answer
      </h2>

      {!selected ? (
        <div className="mt-2 rounded-md border border-border bg-surface p-3 text-sm text-muted">
          Select a question block to start.
        </div>
      ) : (
        <>
          <div className="mt-2 rounded-md border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                {selected.category}
              </span>
              <span className="text-xs text-muted">ID: {selected.id}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {selected.text}
            </p>
          </div>

          <textarea
            className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted"
            rows={6}
            placeholder="Type your answer here…"
            value={answer}
            onChange={(e) => onChangeAnswer(e.target.value)}
          />

          <div className="mt-2">
            <SpeechToTextButton onText={handleSpeechText} />
          </div>

          <button
            type="button"
            onClick={() => onEvaluate()}
            disabled={evaluating || !canEvaluate}
            className="mt-2 w-full rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            title={!canEvaluate ? "Write a bit more before evaluating." : "Evaluate"}
          >
            {evaluating ? "Evaluating…" : "Evaluate"}
          </button>
        </>
      )}
    </section>
  );
}
