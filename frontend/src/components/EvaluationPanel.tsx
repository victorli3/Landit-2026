"use client";

import type { EvaluationResult, QuestionBlock } from "@/types/interviewos";

type Props = {
  selected: QuestionBlock | null;
  evaluation: EvaluationResult | null;
};

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EvaluationPanel({ selected, evaluation }: Props) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h2 className="text-sm font-semibold text-foreground">
        4) Evaluation
      </h2>

      {!selected ? (
        <div className="mt-2 rounded-md border border-border bg-surface p-3 text-sm text-muted">
          Select a question and click Evaluate.
        </div>
      ) : !evaluation ? (
        <div className="mt-2 rounded-md border border-border bg-surface p-3 text-sm text-muted">
          No evaluation yet. Write an answer, then click Evaluate.
        </div>
      ) : (
        <>
          <div className="mt-2 rounded-md border border-border bg-surface p-3">
            <div className="flex items-end gap-3">
              <div className="text-3xl font-extrabold text-foreground">
                {evaluation.overall}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Overall
                </div>
                <div className="text-xs text-muted">Out of 10</div>
              </div>
            </div>

            <div className="mt-2 text-sm font-semibold text-foreground">
              Breakdown
            </div>
            <Meter label="Structure" value={evaluation.radar.structure} />
            <Meter label="Clarity" value={evaluation.radar.clarity} />
            <Meter label="Impact" value={evaluation.radar.impact} />
            <Meter label="Confidence" value={evaluation.radar.confidence} />
            <Meter label="Concision" value={evaluation.radar.concision} />
          </div>

          <div className="mt-2 rounded-md border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">
              Suggestions
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
              {evaluation.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="mt-2 rounded-md border border-border bg-background p-3">
            <div className="text-sm font-semibold text-foreground">
              Sample Improved Response
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted">
              {evaluation.improvedSample}
            </pre>
          </div>
        </>
      )}
    </section>
  );
}
