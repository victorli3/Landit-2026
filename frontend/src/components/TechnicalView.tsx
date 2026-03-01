"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info, BookOpen } from "lucide-react";
import type { TechnicalAnalysis, LeetCodeQuestion } from "@/types/interviewos";
import { analyzeTechnical } from "@/lib/api";
import FadeIn from "@/components/FadeIn";

/* ── Skeleton shimmer primitives ──────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`tech-skeleton rounded-md bg-border/30 ${className}`}
    />
  );
}

function OverviewSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/30 p-8 sm:p-10">
      <Skeleton className="h-5 w-56 mb-5" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

function QuestionsSkeleton() {
  return (
    <div className="mt-10 space-y-3">
      <Skeleton className="h-5 w-64 mb-2" />
      <Skeleton className="h-3 w-48 mb-5" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

/* ── Difficulty badge ────────────────────────────── */

const DIFF_STYLES: Record<LeetCodeQuestion["difficulty"], string> = {
  Easy: "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15",
  Medium: "bg-amber-500/10 text-amber-400/80 border-amber-500/15",
  Hard: "bg-red-500/10 text-red-400/80 border-red-500/15",
};

function DifficultyBadge({ difficulty }: { difficulty: LeetCodeQuestion["difficulty"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${DIFF_STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

/* ── Question card ───────────────────────────────── */

function QuestionCard({
  question,
  index,
}: {
  question: LeetCodeQuestion;
  index: number;
}) {
  return (
    <FadeIn delay={index * 80}>
      <a
        href={question.link}
        target="_blank"
        rel="noopener noreferrer"
        className="tech-question-card group flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-surface/20 px-5 py-4 transition-all duration-150 hover:bg-surface/50 hover:shadow-md hover:shadow-black/10"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {question.title}
            </div>
            <div className="mt-1">
              <DifficultyBadge difficulty={question.difficulty} />
            </div>
          </div>
        </div>
        <ExternalLink
          size={15}
          className="shrink-0 text-muted/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted/70"
          strokeWidth={1.5}
        />
      </a>
    </FadeIn>
  );
}

/* ── Main component ──────────────────────────────── */

type TechnicalViewProps = {
  jobDescription: string;
};

export default function TechnicalView({ jobDescription }: TechnicalViewProps) {
  const [data, setData] = useState<TechnicalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    analyzeTechnical(jobDescription)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobDescription]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="tech-view-container">
        <OverviewSkeleton />
        <QuestionsSkeleton />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="tech-view-container">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-400">
          {error ?? "Something went wrong. Please try again."}
        </div>
      </div>
    );
  }

  /* ── No technical component ── */
  if (!data.hasTechnical) {
    return (
      <div className="tech-view-container">
        <FadeIn>
          <div className="tech-overview-card rounded-2xl border border-border/40 bg-gradient-to-br from-surface/50 to-surface/20 p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/8">
                <Info size={18} className="text-muted/70" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                No Algorithmic Coding Interview Detected
              </h3>
            </div>
            <p className="text-sm leading-[1.75] text-muted max-w-2xl">
              {data.summary}
            </p>
          </div>
        </FadeIn>

        {data.preparationTips && data.preparationTips.length > 0 && (
          <FadeIn delay={150}>
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={15} className="text-muted/50" strokeWidth={1.5} />
                <h4 className="text-sm font-semibold text-foreground">
                  What to Prepare Instead
                </h4>
              </div>
              <div className="space-y-3">
                {data.preparationTips.map((tip, i) => (
                  <FadeIn key={i} delay={200 + i * 80}>
                    <div className="flex gap-3 rounded-xl border border-border/30 bg-surface/20 px-5 py-4">
                      <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent/8 text-[10px] font-bold text-muted/70">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-muted">{tip}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    );
  }

  /* ── Has technical component ── */
  return (
    <div className="tech-view-container">
      <FadeIn>
        <div className="tech-overview-card rounded-2xl border border-border/40 bg-gradient-to-br from-surface/50 to-surface/20 p-8 sm:p-10">
          <h3 className="text-lg font-semibold text-foreground tracking-tight mb-4">
            Technical Interview Overview
          </h3>
          <p className="text-sm leading-[1.75] text-muted max-w-2xl">
            {data.summary}
          </p>
        </div>
      </FadeIn>

      <div className="mt-10">
        <FadeIn delay={100}>
          <h4 className="text-base font-semibold text-foreground tracking-tight">
            Most Common LeetCode Questions
          </h4>
          <p className="mt-1 text-[11px] text-muted/60">
            Based on aggregated interview data
          </p>
        </FadeIn>

        <div className="mt-5 space-y-3">
          {data.leetcodeQuestions.map((q, i) => (
            <QuestionCard key={q.title} question={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
