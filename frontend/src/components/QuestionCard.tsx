"use client";

import type { QuestionBlock } from "@/types/interviewos";

type Props = {
  q: QuestionBlock;
  selected: boolean;
  status: "New" | "Answered" | "Evaluated";
  onSelect: () => void;
};

export function QuestionCard({ q, selected, status, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "w-full rounded-md border p-3 text-left transition " +
        (selected
          ? "border-accent bg-surface"
          : "border-border bg-background hover:bg-surface")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
          {q.category}
        </span>
        <span className="text-xs text-muted">{status}</span>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">
        {q.text}
      </p>

      {q.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {q.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
