"use client";

import type { QuestionBlock } from "@/types/interviewos";
import { QuestionCard } from "./QuestionCard";

type Props = {
  questions: QuestionBlock[];
  selectedId: string | null;
  answersById: Record<string, string>;
  evalIds: Set<string>;
  onSelect: (id: string) => void;
};

export function QuestionList({
  questions,
  selectedId,
  answersById,
  evalIds,
  onSelect,
}: Props) {
  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-semibold text-foreground">
        2) Question Blocks
      </h2>
      <p className="mt-1 text-xs text-muted">
        Click a block to answer and evaluate.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {questions.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted">
            No questions yet. Paste a job description and click “Generate Questions”.
          </div>
        ) : (
          questions.map((q) => {
            const hasAnswer = (answersById[q.id] ?? "").trim().length > 0;
            const evaluated = evalIds.has(q.id);
            const status: "New" | "Answered" | "Evaluated" = evaluated
              ? "Evaluated"
              : hasAnswer
                ? "Answered"
                : "New";

            return (
              <QuestionCard
                key={q.id}
                q={q}
                selected={q.id === selectedId}
                status={status}
                onSelect={() => onSelect(q.id)}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
