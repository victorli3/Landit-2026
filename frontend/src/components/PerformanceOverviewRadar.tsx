"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RadarChart from "@/components/RadarChart";
import type { EvaluationResult } from "@/types/interviewos";

const METRIC_KEYS = ["structure", "clarity", "impact", "confidence", "concision"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_LABELS: Record<MetricKey, string> = {
  structure: "Structure",
  clarity: "Clarity",
  impact: "Impact",
  confidence: "Confidence",
  concision: "Concision",
};

const METRIC_DEFINITIONS: Record<MetricKey, string> = {
  structure: "How logically ordered your story is, from setup to action to result.",
  clarity: "How easy your answer is to follow without re-reading.",
  impact: "How strong and measurable your results are.",
  confidence: "How decisive and self-assured you sound.",
  concision: "How efficiently you communicate without unnecessary filler.",
};

const METRIC_SUGGESTIONS: Record<MetricKey, string[]> = {
  structure: [
    "Use STAR headings: Situation, Task, Action, Result.",
    "Avoid jumping between steps mid-answer.",
  ],
  clarity: [
    "Name the tools and outcomes explicitly.",
    "Avoid vague phrases; be specific about what you did.",
  ],
  impact: [
    "Add numbers: time saved, revenue, performance gains.",
    "Quantify scale (users affected, % improvement).",
  ],
  confidence: [
    'Remove hedging phrases like "maybe" or "I think."',
    "State outcomes directly without over-qualifying.",
  ],
  concision: [
    "Cut filler words; aim for one strong sentence per idea.",
    "Lead with the result, then add context only if needed.",
  ],
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

type Props = {
  /** Map of questionId to EvaluationResult from the workspace */
  evalsById: Record<string, EvaluationResult>;
};

const CYCLE_INTERVAL = 4000; // ms between auto-advances

export default function PerformanceOverviewRadar({ evalsById }: Props) {
  const [expanded, setExpanded] = useState<MetricKey>(METRIC_KEYS[0]);
  const paused = useRef(false);

  // Auto-cycle through metrics
  const advance = useCallback(() => {
    if (paused.current) return;
    setExpanded((prev) => {
      const idx = prev ? METRIC_KEYS.indexOf(prev) : -1;
      return METRIC_KEYS[(idx + 1) % METRIC_KEYS.length];
    });
  }, []);

  useEffect(() => {
    const id = setInterval(advance, CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [advance]);

  const evals = useMemo(() => Object.values(evalsById ?? {}), [evalsById]);

  const radarData = useMemo(() => {
    return METRIC_KEYS.map((key) => ({
      label: METRIC_LABELS[key],
      value: clamp(avg(evals.map((e) => e.radar[key] ?? 0)), 0, 10),
    }));
  }, [evals]);

  const count = evals.length;
  const isEmpty = count === 0;

  return (
    <div className="rounded-md border border-border bg-background">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Performance Overview
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Aggregated across interviews for this role
        </p>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {isEmpty ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-foreground">No interviews yet</p>
            <p className="mt-1 text-xs text-muted">
              Complete an interview to see your performance overview.
            </p>
          </div>
        ) : (
          <>
            {/* Chart + Legend side-by-side */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              {/* Radar chart — left */}
              <div className="w-full min-w-0 sm:flex-1 sm:max-w-[240px]">
                <RadarChart
                  data={radarData}
                  tooltipSuffix={`(avg of ${count})`}
                />
              </div>

              {/* Legend — right */}
              <div className="flex w-full flex-col gap-1.5 sm:w-[160px] sm:shrink-0">
                {METRIC_KEYS.map((key) => {
                  const score = radarData.find(
                    (d) => d.label === METRIC_LABELS[key],
                  )?.value;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition-all duration-300 hover:bg-surface ${
                        expanded === key
                          ? "bg-surface/60 ring-1 ring-border"
                          : ""
                      }`}
                      onClick={() => {
                        paused.current = true;
                        setExpanded(key);
                      }}
                      onMouseEnter={() => { paused.current = true; }}
                      onMouseLeave={() => { paused.current = false; }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="block h-2 w-2 rounded-full bg-accent/50" />
                        <span className="text-[11px] font-medium text-foreground">
                          {METRIC_LABELS[key]}
                        </span>
                      </div>
                      {score !== undefined && (
                        <span className="text-[10px] tabular-nums text-muted">
                          {score.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expanded detail panel — shown below chart+legend when a metric is selected */}
            {expanded && (
              <div
                key={expanded}
                className="mt-4 rounded-md border border-border bg-surface/40 px-4 py-3 animate-[fadeSlideIn_350ms_ease-out]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {METRIC_LABELS[expanded]}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {(radarData.find((d) => d.label === METRIC_LABELS[expanded])?.value ?? 0).toFixed(1)}/10
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted">
                  {METRIC_DEFINITIONS[expanded]}
                </p>
                <div className="mt-2 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted mb-1">
                    Suggestions
                  </div>
                  <ul className="grid gap-0.5">
                    {METRIC_SUGGESTIONS[expanded].map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground"
                      >
                        <span className="mt-px shrink-0 text-muted" aria-hidden="true">
                          &bull;
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
