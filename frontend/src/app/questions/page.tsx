"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppState, WorkspaceState } from "@/types/interviewos";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { evaluateAnswer } from "@/lib/api";
import { AnswerPanel } from "@/components/AnswerPanel";
import { EvaluationPanel } from "@/components/EvaluationPanel";
import { APP_STORAGE_KEY, emptyAppState, migrateToAppState } from "@/lib/appState";

const EMPTY_WS: WorkspaceState = {
  jobDescription: "",
  questions: [],
  selectedQuestionId: null,
  answersById: {},
  evalsById: {},
};

export default function QuestionsPage() {
  const router = useRouter();
  const [app, setApp] = useLocalStorageState<AppState>(APP_STORAGE_KEY, emptyAppState(), {
    migrate: migrateToAppState,
  });
  const [evaluating, setEvaluating] = useState(false);

  const roles = useMemo(() => app.roles ?? [], [app.roles]);

  const activeRole = useMemo(() => {
    if (!app.activeRoleId) return null;
    return roles.find((r) => r.id === app.activeRoleId) ?? null;
  }, [app.activeRoleId, roles]);

  const ws = activeRole?.workspace ?? EMPTY_WS;

  const setWorkspace = useCallback(
    (updater: (prev: WorkspaceState) => WorkspaceState) => {
      setApp((prev) => {
        const roleId = prev.activeRoleId;
        if (!roleId) return prev;
        const idx = (prev.roles ?? []).findIndex((r) => r.id === roleId);
        if (idx < 0) return prev;
        const rolesCopy = [...prev.roles];
        const role = rolesCopy[idx];
        const now = new Date().toISOString();
        rolesCopy[idx] = {
          ...role,
          workspace: updater(role.workspace),
          updatedAtIso: now,
        };
        return { ...prev, roles: rolesCopy };
      });
    },
    [setApp]
  );

  useEffect(() => {
    // Default active role to the first role if missing.
    if (roles.length === 0) return;
    if (app.activeRoleId) return;
    setApp((prev) => ({ ...prev, activeRoleId: prev.roles[0]?.id ?? null }));
  }, [app.activeRoleId, roles.length, setApp]);

  useEffect(() => {
    // Keep selectedQuestionId valid.
    if (!activeRole) return;
    if (ws.questions.length === 0) return;
    const firstId = ws.questions[0]?.id ?? null;
    if (!ws.selectedQuestionId) {
      setWorkspace((prev) => ({ ...prev, selectedQuestionId: firstId }));
      return;
    }
    const exists = ws.questions.some((q) => q.id === ws.selectedQuestionId);
    if (!exists) {
      setWorkspace((prev) => ({ ...prev, selectedQuestionId: firstId }));
    }
  }, [activeRole, setWorkspace, ws.questions, ws.selectedQuestionId]);

  const selected = useMemo(() => {
    if (ws.questions.length === 0) return null;
    const byId = ws.selectedQuestionId
      ? ws.questions.find((q) => q.id === ws.selectedQuestionId)
      : null;
    return byId ?? ws.questions[0] ?? null;
  }, [ws.questions, ws.selectedQuestionId]);

  const selectedAnswer = selected ? ws.answersById[selected.id] ?? "" : "";
  const selectedEval = selected ? ws.evalsById[selected.id] ?? null : null;

  const currentIndex = useMemo(() => {
    if (!selected) return -1;
    return ws.questions.findIndex((q) => q.id === selected.id);
  }, [ws.questions, selected]);

  const total = ws.questions.length;
  const canGoBack = currentIndex > 0;
  const canGoNext = Boolean(selected && selectedEval && currentIndex >= 0 && currentIndex < total - 1);
  const atLast = Boolean(selected && currentIndex === total - 1);

  const evaluate = async () => {
    if (!selected) return;
    setEvaluating(true);
    try {
      const result = await evaluateAnswer({
        jobDescription: ws.jobDescription,
        question: selected.text,
        answer: selectedAnswer,
      });

      setWorkspace((prev) => ({
        ...prev,
        evalsById: {
          ...prev.evalsById,
          [selected.id]: result,
        },
      }));
    } finally {
      setEvaluating(false);
    }
  };

  const goBack = () => {
    if (!selected || currentIndex <= 0) return;
    const prev = ws.questions[currentIndex - 1];
    if (!prev) return;
    setWorkspace((p) => ({ ...p, selectedQuestionId: prev.id }));
  };

  const goNext = () => {
    if (!selected) return;
    if (!selectedEval) return;
    if (currentIndex < 0) return;
    const next = ws.questions[currentIndex + 1];
    if (!next) return;
    setWorkspace((prev) => ({
      ...prev,
      selectedQuestionId: next.id,
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">Flashcards</h1>
      <p className="text-sm text-muted">
        Step 2: answer one question at a time, then move to the next.
      </p>

      {roles.length === 0 ? (
        <div className="rounded-md border border-border bg-background p-4 text-sm text-muted">
          No roles yet. Go to <Link className="underline text-foreground" href="/job">Roles</Link> and click
          &ldquo;+ New role&rdquo;.
        </div>
      ) : ws.questions.length === 0 ? (
        <div className="rounded-md border border-border bg-background p-4 text-sm text-muted">
          No questions yet for this role. Go to <Link className="underline text-foreground" href="/job">Roles</Link> and
          create a role.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/job")}
              className="rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              ← Back to Roles
            </button>
            {activeRole ? (
              <span className="text-xs text-muted">
                Role: <span className="font-medium text-foreground">{activeRole.name}</span>
              </span>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">
                Question {currentIndex + 1} of {total}
              </div>
              {selected ? (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
                  {selected.category}
                </span>
              ) : null}
            </div>

            <div className="mt-3 rounded-md border border-border bg-surface p-4 text-foreground">
              <div className="text-xs text-muted">Flashcard</div>
              <div className="mt-2 text-base font-semibold">{selected?.text}</div>
              {selected?.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnswerPanel
              selected={selected}
              answer={selectedAnswer}
              onChangeAnswer={(text) => {
                if (!selected) return;
                setWorkspace((prev) => ({
                  ...prev,
                  answersById: {
                    ...prev.answersById,
                    [selected.id]: text,
                  },
                }));
              }}
              onEvaluate={evaluate}
              evaluating={evaluating}
            />

            <EvaluationPanel selected={selected} evaluation={selectedEval} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className="rounded border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
              title={!canGoBack ? "You're on the first question." : "Previous question"}
            >
              &larr; Previous
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              title={
                atLast
                  ? "You’re on the last question."
                  : !selectedEval
                    ? "Evaluate this answer to unlock Next."
                    : "Next question"
              }
            >
              Next Question &rarr;
            </button>

            {atLast ? (
              <span className="text-xs text-muted">
                You’re on the last question.
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
