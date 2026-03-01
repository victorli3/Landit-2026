"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AppState, WorkspaceState } from "@/types/interviewos";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { generateQuestions } from "@/lib/api";
import {
  APP_STORAGE_KEY,
  createRole,
  emptyAppState,
  emptyWorkspace,
  migrateToAppState,
} from "@/lib/appState";
import type { EvaluationResult } from "@/types/interviewos";
import PerformanceOverviewRadar from "@/components/PerformanceOverviewRadar";
import TechnicalView from "@/components/TechnicalView";
import {
  LayoutGrid,
  Eye,
  Zap,
  Shield,
  Scissors,
  ArrowLeft,
  MessageSquare,
  Terminal,
  ChevronRight,
} from "lucide-react";

function countCompleted(ws: WorkspaceState) {
  return Object.keys(ws.evalsById ?? {}).length;
}

function countTotal(ws: WorkspaceState) {
  return ws.questions?.length ?? 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeDashboard(evalsById: Record<string, EvaluationResult>) {
  const evals = Object.values(evalsById ?? {});
  const overallAvg = clamp(avg(evals.map((e) => e.overall)), 0, 10);

  const structureAvg = clamp(avg(evals.map((e) => e.radar.structure)), 0, 10);
  const clarityAvg = clamp(avg(evals.map((e) => e.radar.clarity)), 0, 10);
  const impactAvg = clamp(avg(evals.map((e) => e.radar.impact)), 0, 10);
  const confidenceAvg = clamp(avg(evals.map((e) => e.radar.confidence)), 0, 10);
  const concisionAvg = clamp(avg(evals.map((e) => e.radar.concision ?? 0)), 0, 10);

  const overallScores = evals.map((e) => e.overall);
  const mean = avg(overallScores);
  const variance = overallScores.length
    ? avg(overallScores.map((s) => (s - mean) * (s - mean)))
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistency = evals.length >= 2 ? clamp(Math.round(100 - stdDev * 12), 0, 100) : null;

  return {
    overallAvg,
    breakdown: {
      structure: structureAvg,
      clarity: clarityAvg,
      impact: impactAvg,
      confidence: confidenceAvg,
      concision: concisionAvg,
    },
    consistency,
  };
}

export default function JobPage() {
  return (
    <Suspense>
      <JobPageInner />
    </Suspense>
  );
}

function JobPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [app, setApp] = useLocalStorageState<AppState>(APP_STORAGE_KEY, emptyAppState(), {
    migrate: migrateToAppState,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");
  const [hubRoleId, setHubRoleId] = useState<string | null>(null);
  const [hubMode, setHubMode] = useState<"behavioral" | "technical" | null>(null);

  const roles = useMemo(() => app.roles ?? [], [app.roles]);

  // Auto-open hub from ?hub= query param (fired by home page Generate)
  useEffect(() => {
    const hubParam = searchParams.get("hub");
    if (hubParam && roles.length > 0) {
      const found = roles.find((r) => r.id === hubParam);
      if (found) {
        setHubRoleId(found.id);
        // Clean the URL without navigation
        window.history.replaceState({}, "", "/job");
      }
    }
  }, [searchParams, roles]);

  const hubRole = hubRoleId ? roles.find((r) => r.id === hubRoleId) ?? null : null;
  const hubCompanyName = (hubRole?.name.split("—")[0] ?? hubRole?.name ?? "").trim();
  const hubMetrics = hubRole ? computeDashboard(hubRole.workspace.evalsById) : null;

  const beginCreate = useCallback(() => {
    setShowCreate(true);
    setNewRoleName("");
    setNewJobDescription("");
  }, []);

  const cancelCreate = useCallback(() => {
    if (isCreating) return;
    setShowCreate(false);
    setNewRoleName("");
    setNewJobDescription("");
  }, [isCreating]);

  const handleCreate = useCallback(async () => {
    const name = newRoleName.trim();
    const jd = newJobDescription.trim();
    if (!name || !jd) return;

    setIsCreating(true);
    try {
      const questions = await generateQuestions(jd);
      const workspace: WorkspaceState = {
        ...emptyWorkspace(jd),
        questions,
        selectedQuestionId: questions[0]?.id ?? null,
      };
      const role = createRole({ name, workspace });

      setApp((prev) => ({
        ...prev,
        roles: [...(prev.roles ?? []), role],
        activeRoleId: role.id,
      }));
      setShowCreate(false);
    } finally {
      setIsCreating(false);
    }
  }, [newJobDescription, newRoleName, setApp]);

  const handleDelete = useCallback(
    (roleId: string) => {
      setApp((prev) => {
        const remaining = (prev.roles ?? []).filter((r) => r.id !== roleId);
        const nextActive = prev.activeRoleId === roleId ? (remaining[0]?.id ?? null) : prev.activeRoleId;
        return { ...prev, roles: remaining, activeRoleId: nextActive };
      });
    },
    [setApp]
  );

  const handleContinue = useCallback(
    (roleId: string) => {
      setApp((prev) => ({ ...prev, activeRoleId: roleId }));
      router.push("/questions");
    },
    [router, setApp]
  );

  const openHub = useCallback((roleId: string) => {
    setHubRoleId(roleId);
  }, []);

  const closeHub = useCallback(() => {
    setHubRoleId(null);
    setHubMode(null);
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Roles
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create multiple interview workspaces (one per role).
          </p>
        </div>

        <button
          type="button"
          onClick={beginCreate}
          disabled={isCreating}
          className="rounded border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          + New role
        </button>
      </div>

      {showCreate ? (
        <div className="mb-6 rounded-md border border-border bg-background p-5">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Role name</label>
              <input
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                placeholder="e.g. Adobe — Frontend Intern"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground">Job description</label>
              <textarea
                className="min-h-40 w-full resize-none rounded-md border border-border bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted"
                placeholder="Paste the job description here…"
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelCreate}
                disabled={isCreating}
                className="rounded border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !newRoleName.trim() || !newJobDescription.trim()}
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? "Generating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roles.length === 0 ? (
        <div className="rounded-md border border-border px-6 py-10 text-center text-sm text-muted">
          No roles yet. Click &ldquo;+ New role&rdquo; to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_420px]">
          {/* Left — role cards (2-col grid on sm+) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roles.map((role) => {
            const completed = countCompleted(role.workspace);
            const total = countTotal(role.workspace);
            const canContinue = total > 0;
            const progressPct = total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0;
            const ctaLabel = completed > 0 ? "Continue" : "Start";

            return (
              <div
                key={role.id}
                className="rounded-md border border-border bg-background transition-colors hover:bg-surface"
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="flex h-full w-full cursor-pointer flex-col p-5 text-left"
                  onClick={() => openHub(role.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openHub(role.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {role.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(role.id);
                        }}
                        className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
                        aria-label={`Delete role ${role.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>
                        {completed}/{total} completed
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openHub(role.id);
                      }}
                      disabled={!canContinue}
                      className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {ctaLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Right — Performance Overview radar panel */}
          {(() => {
            const activeRole = app.activeRoleId
              ? roles.find((r) => r.id === app.activeRoleId) ?? roles[0]
              : roles[0];
            if (!activeRole) return null;
            return (
              <div className="sticky top-6">
                <PerformanceOverviewRadar evalsById={activeRole.workspace.evalsById} />
              </div>
            );
          })()}
        </div>
      )}

      {hubRole ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm hub-backdrop-enter"
            onClick={closeHub}
          />

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div
              className="hub-panel-enter relative flex w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-background shadow-2xl"
              style={{ height: "min(80vh, 720px)" }}
            >
              {/* ── Top bar ── */}
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-8 py-4">
                <button
                  type="button"
                  onClick={closeHub}
                  className="hub-ghost-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-all duration-200 hover:bg-surface hover:text-foreground"
                >
                  <ArrowLeft size={14} />
                  Back to Roles
                </button>
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted/60">
                  Role Hub
                </div>
              </div>

              {/* ── Body — flex row, NO inner scroll ── */}
              <div className="flex min-h-0 flex-1">
                {/* Left — 60% */}
                <div className="flex w-[60%] flex-col overflow-y-auto px-10 py-7">
                  {/* Title */}
                  <h2 className="font-serif text-4xl font-bold tracking-tight text-foreground">
                    {hubCompanyName || hubRole.name}
                  </h2>

                  {/* Step indicator */}
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                        1
                      </span>
                      <span className="text-xs font-medium text-foreground">Choose mode</span>
                    </div>
                    <div className="h-px w-6 bg-border/60" />
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border/60 text-[10px] font-medium text-muted">
                        2
                      </span>
                      <span className="text-xs text-muted">Answer questions</span>
                    </div>
                  </div>

                  {/* Mode cards / Technical view */}
                  {hubMode === "technical" ? (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setHubMode(null)}
                        className="hub-ghost-btn mb-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted transition-all duration-200 hover:bg-surface hover:text-foreground"
                      >
                        <ArrowLeft size={12} />
                        Back to modes
                      </button>
                      <TechnicalView jobDescription={hubRole.workspace.jobDescription ?? ""} />
                    </div>
                  ) : (
                    <div className="mt-5">
                      <p className="text-[11px] text-muted/70">
                        Pick a mode to continue to questions.
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-4">
                        {/* Behavioral */}
                        <button
                          type="button"
                          onClick={() => {
                            closeHub();
                            handleContinue(hubRole.id);
                          }}
                          className="hub-mode-card group relative flex items-center gap-4 rounded-xl border border-border/50 bg-surface/40 px-5 py-4 text-left transition-all duration-200 hover:bg-surface/70 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <MessageSquare size={18} className="text-accent/70" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-foreground">Behavioral</div>
                            <div className="mt-0.5 text-[11px] text-muted/60">Story + STAR responses</div>
                          </div>
                          <ChevronRight size={16} className="shrink-0 text-muted/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted/60" />
                        </button>

                        {/* Technical */}
                        <button
                          type="button"
                          onClick={() => setHubMode("technical")}
                          className="hub-mode-card group relative flex items-center gap-4 rounded-xl border border-border/50 bg-surface/40 px-5 py-4 text-left transition-all duration-200 hover:bg-surface/70 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <Terminal size={18} className="text-accent/70" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-foreground">Technical</div>
                            <div className="mt-0.5 text-[11px] text-muted/60">Coding + problem solving</div>
                          </div>
                          <ChevronRight size={16} className="shrink-0 text-muted/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted/60" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Role description */}
                  <div className="mt-8">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted/70">
                      Role Description
                    </div>
                    <div className="hub-description-box mt-3 rounded-xl border border-border/50 bg-surface/30 p-1">
                      <textarea
                        value={hubRole.workspace.jobDescription ?? ""}
                        onChange={(e) => {
                          const next = e.target.value;
                          setApp((prev) => {
                            const roles = prev.roles ?? [];
                            const idx = roles.findIndex((r) => r.id === hubRole.id);
                            if (idx < 0) return prev;
                            const now = new Date().toISOString();
                            const rolesCopy = [...roles];
                            const role = rolesCopy[idx];
                            rolesCopy[idx] = {
                              ...role,
                              workspace: {
                                ...role.workspace,
                                jobDescription: next,
                              },
                              updatedAtIso: now,
                            };
                            return { ...prev, roles: rolesCopy };
                          });
                        }}
                        placeholder="Add a role description…"
                        className="hub-textarea min-h-[140px] w-full resize-none rounded-lg border-none bg-transparent p-5 text-sm leading-[1.7] text-foreground outline-none placeholder:text-muted/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Right — 40% analytics — NO overflow scroll */}
                <div className="flex w-[40%] flex-col border-l border-border/40 bg-gradient-to-b from-surface/60 to-surface/20">
                  <div className="hub-analytics-enter flex flex-1 flex-col justify-between px-8 py-7">
                    {/* Overall score */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted/70">
                        Overall Score
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                          {hubMetrics ? hubMetrics.overallAvg.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-base text-muted/60">/10</span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                        <div
                          className="hub-bar-fill h-full rounded-full bg-accent"
                          style={{
                            width: `${hubMetrics ? (hubMetrics.overallAvg / 10) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Breakdown — compact, no scroll */}
                    <div className="mt-6">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted/70">
                        Breakdown
                      </div>

                      <div className="mt-3 grid gap-3">
                        {(
                          [
                            ["Structure", hubMetrics?.breakdown.structure ?? 0, LayoutGrid],
                            ["Clarity", hubMetrics?.breakdown.clarity ?? 0, Eye],
                            ["Impact", hubMetrics?.breakdown.impact ?? 0, Zap],
                            ["Confidence", hubMetrics?.breakdown.confidence ?? 0, Shield],
                            ["Concision", hubMetrics?.breakdown.concision ?? 0, Scissors],
                          ] as const
                        ).map(([label, score, Icon], idx) => (
                          <div
                            key={label}
                            className="hub-metric-row group rounded-lg px-2.5 py-2 -mx-2.5 transition-all duration-200 hover:bg-white/[0.03]"
                            style={{ animationDelay: `${idx * 80}ms` }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Icon size={13} className="text-muted/50 transition-colors duration-200 group-hover:text-muted" strokeWidth={1.5} />
                                <span className="text-[13px] text-foreground">{label}</span>
                              </div>
                              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                                {score.toFixed(1)}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/40">
                              <div
                                className="hub-bar-fill h-full rounded-full bg-accent/70"
                                style={{
                                  width: `${(score / 10) * 100}%`,
                                  animationDelay: `${300 + idx * 80}ms`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats — bottom, pushed down by justify-between */}
                    <div className="mt-6">
                      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border/30">
                        {[
                          {
                            label: "Completed",
                            value: `${countCompleted(hubRole.workspace)} / ${countTotal(hubRole.workspace)}`,
                          },
                          {
                            label: "Avg Score",
                            value: hubMetrics
                              ? hubMetrics.overallAvg.toFixed(1)
                              : "0.0",
                          },
                          {
                            label: "Consistency",
                            value:
                              hubMetrics?.consistency === null
                                ? "—"
                                : `${hubMetrics?.consistency ?? 0}%`,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="flex flex-col items-center bg-background/80 px-3 py-3"
                          >
                            <span className="text-base font-bold tabular-nums text-foreground">
                              {stat.value}
                            </span>
                            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted/60">
                              {stat.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
