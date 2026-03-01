"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  motion,
  useInView,
  type Variants,
} from "framer-motion";
import type { AppState, WorkspaceState } from "@/types/interviewos";
import type { EvaluationResult } from "@/types/interviewos";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { mockGenerateQuestions } from "@/lib/mockAi";
import {
  APP_STORAGE_KEY,
  createRole,
  emptyAppState,
  emptyWorkspace,
  migrateToAppState,
} from "@/lib/appState";
import FadeIn from "@/components/FadeIn";
import WorkflowDemo from "@/components/WorkflowDemo";

/* ── Framer Motion variants ─────────────────────────── */

const heroItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const scrollCard: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* ── helpers ─────────────────────────────────────────── */

function countCompleted(ws: WorkspaceState) {
  return Object.keys(ws.evalsById ?? {}).length;
}

function countTotal(ws: WorkspaceState) {
  return ws.questions?.length ?? 0;
}

function readinessScore(ws: WorkspaceState) {
  const evals = Object.values(ws.evalsById ?? {});
  if (evals.length === 0) return 0;
  const sum = evals.reduce((s, e: EvaluationResult) => s + e.overall, 0);
  return Math.round((sum / evals.length) * 10) / 10;
}

/* ── rotating placeholder hook ───────────────────────── */

const PLACEHOLDER_HINTS = [
  "Paste a software engineering job description…",
  "Try a product manager listing from your target company…",
  "Works best with the full responsibilities section…",
  "Include qualifications for more targeted questions…",
];

function useRotatingPlaceholder(interval = 3500) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % PLACEHOLDER_HINTS.length),
      interval,
    );
    return () => clearInterval(id);
  }, [interval]);
  return PLACEHOLDER_HINTS[idx];
}

/* ── page ────────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const [app, setApp] = useLocalStorageState<AppState>(
    APP_STORAGE_KEY,
    emptyAppState(),
    { migrate: migrateToAppState },
  );

  const [jd, setJd] = useState("");
  const [roleName, setRoleName] = useState("");
  const [generating, setGenerating] = useState(false);
  const placeholder = useRotatingPlaceholder();

  const roles = useMemo(() => app.roles ?? [], [app.roles]);

  /* Scroll-reveal ref for How-it-works */
  const howRef = useRef<HTMLDivElement>(null);
  const howInView = useInView(howRef, { once: true, margin: "-10%" });

  const handleGenerate = useCallback(async () => {
    const name = roleName.trim() || "New Role";
    const desc = jd.trim();
    if (!desc) return;

    setGenerating(true);
    try {
      const questions = await mockGenerateQuestions(desc);
      const workspace: WorkspaceState = {
        ...emptyWorkspace(desc),
        questions,
        selectedQuestionId: questions[0]?.id ?? null,
      };
      const role = createRole({ name, workspace });

      setApp((prev) => ({
        ...prev,
        roles: [...(prev.roles ?? []), role],
        activeRoleId: role.id,
      }));

      setJd("");
      setRoleName("");
      router.push(`/job?hub=${role.id}`);
    } finally {
      setGenerating(false);
    }
  }, [jd, roleName, router, setApp]);

  return (
    <div className="landing-page">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="section-padding">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — staggered entrance */}
          <div>
            <motion.h1
              variants={heroItem}
              initial="hidden"
              animate="show"
              custom={0}
              className="font-serif text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl max-w-[600px]"
            >
              Land the role you
              <br />
              have your eyes on.
            </motion.h1>

            <motion.p
              variants={heroItem}
              initial="hidden"
              animate="show"
              custom={0.12}
              className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
            >
              Tailored behavioral practice for specific companies. Turn your job
              description into a high-fidelity mock interview.
            </motion.p>

            <motion.div
              variants={heroItem}
              initial="hidden"
              animate="show"
              custom={0.22}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="#prepare"
                className="cta-primary cta-hero-pulse inline-flex items-center rounded-md bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Start Preparing
              </a>
              <a
                href="#how"
                className="cta-secondary inline-flex items-center rounded-md border border-border/80 bg-surface/40 px-7 py-3.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                See How It Works
              </a>
            </motion.div>
          </div>

          {/* Right — mockup entrance */}
          <motion.div
            variants={heroItem}
            initial="hidden"
            animate="show"
            custom={0.18}
          >
            <WorkflowDemo />
          </motion.div>
        </div>
      </section>

      {/* ── Section divider ── */}
      <div className="section-divider mx-auto" />
      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how" className="section-padding">
        <FadeIn>
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How Landit Works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              From job description to interview-ready in minutes.
            </p>
          </div>
        </FadeIn>

        <motion.div
          ref={howRef}
          variants={staggerContainer}
          initial="hidden"
          animate={howInView ? "show" : "hidden"}
          className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {[
            {
              step: "01",
              title: "Paste Your Job Description",
              desc: "Drop in any job listing. Landit extracts the key skills and responsibilities to build your question set.",
            },
            {
              step: "02",
              title: "Practice Realistic Questions",
              desc: "Answer behavioral and role-specific questions via text or speech. Each one mirrors what top companies actually ask.",
            },
            {
              step: "03",
              title: "Improve with AI Feedback",
              desc: "Get scored on Structure, Clarity, Impact, Confidence, and Concision. See exactly how to sharpen every answer.",
            },
          ].map((panel) => (
            <motion.div key={panel.step} variants={scrollCard}>
              <div className="how-card group rounded-lg border border-border bg-background p-6 sm:p-8">
                <div className="text-xs font-semibold text-muted transition-opacity duration-200 group-hover:opacity-100 opacity-70">
                  {panel.step}
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {panel.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted max-w-[340px]">
                  {panel.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Section divider ── */}
      <div className="section-divider mx-auto" />

      {/* ═══════════════ PREPARE PANEL ═══════════════ */}
      <section id="prepare" className="section-padding">
        <FadeIn>
          <div className="prepare-card rounded-xl border border-border bg-background p-6 sm:p-10">
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Generate Your Mock Interview
              </h2>
              <p className="mt-2 text-sm text-muted max-w-lg">
                Paste a job description below and we&apos;ll create tailored
                behavioral questions in seconds.
              </p>
            </div>

            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Role name — e.g. Adobe — Software Engineer"
              className="mb-3 w-full rounded-md border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted transition-colors focus:border-accent/40"
            />

            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder={placeholder}
              rows={7}
              className="w-full resize-none rounded-md border border-border bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted transition-colors focus:border-accent/40"
            />

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !jd.trim()}
                className="cta-primary rounded-md bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {generating ? "Generating…" : "Generate Interview"}
              </button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════ DASHBOARD ═══════════════ */}
      <section className="section-padding">
        <FadeIn>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your Interview Dashboard
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base max-w-lg">
            Track readiness, consistency, and growth over time.
          </p>
        </FadeIn>

        <div className="mt-10">
          {roles.length === 0 ? (
            <FadeIn delay={100}>
              <div className="rounded-lg border border-border px-6 py-14 text-center text-sm text-muted">
                No workspaces yet. Paste a job description above to get started.
              </div>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role, i) => {
                const completed = countCompleted(role.workspace);
                const total = countTotal(role.workspace);
                const score = readinessScore(role.workspace);

                return (
                  <FadeIn key={role.id} delay={i * 80}>
                    <Link
                      href={`/job?hub=${role.id}`}
                      className="dashboard-card block rounded-lg border border-border bg-background p-6"
                    >
                      <div className="text-sm font-semibold text-foreground">
                        {role.name}
                      </div>
                      <div className="mt-5 flex items-end justify-between">
                        <div>
                          <div className="font-serif text-3xl font-bold text-foreground">
                            {score.toFixed(1)}<span className="text-lg text-muted">/10</span>
                          </div>
                          <div className="mt-1 text-xs text-muted">
                            Readiness Score
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted">
                          {completed}/{total} completed
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ PRODUCT SHOWCASE ═══════════════ */}
      <section className="section-padding">
        <FadeIn>
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Practice Like It&apos;s the Real Interview.
            </h2>
          </div>
        </FadeIn>
        <FadeIn delay={150}>
          <div className="showcase-bg mx-auto mt-12 max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-10">
            {/* Mock UI — flashcard mode */}
            <div className="showcase-float rounded-lg border border-border bg-background p-5 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-accent/40" />
                <div className="h-2 w-24 rounded-full bg-border" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-3 w-full rounded-full bg-border/70" />
                <div className="h-3 w-5/6 rounded-full bg-border/50" />
                <div className="h-3 w-2/3 rounded-full bg-border/40" />
              </div>
              <div className="mt-8 flex gap-4">
                <div className="flex-1 rounded-md border border-border p-4">
                  <div className="h-2 w-16 rounded-full bg-accent/30" />
                  <div className="mt-4 space-y-2">
                    <div className="h-1.5 w-full rounded-full bg-accent/20" />
                    <div className="h-1.5 w-4/5 rounded-full bg-accent/15" />
                    <div className="h-1.5 w-3/5 rounded-full bg-accent/10" />
                    <div className="h-1.5 w-2/5 rounded-full bg-accent/10" />
                    <div className="h-1.5 w-1/2 rounded-full bg-accent/10" />
                  </div>
                </div>
                <div className="flex-1 rounded-md border border-border p-4">
                  <div className="h-2 w-20 rounded-full bg-border" />
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="h-16 w-16 rounded-full border-2 border-accent/30" />
                    <div className="h-2 w-12 rounded-full bg-border/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="section-padding border-t border-border">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div>
            <div className="font-serif text-lg font-bold text-foreground">
              Landit
            </div>
            <p className="mt-1 text-xs text-muted max-w-sm">
              AI-powered interview prep that adapts to the role you want.
            </p>
          </div>
          <nav className="flex items-center gap-3 text-xs">
            <Link href="/" className="cta-secondary rounded-md border border-border/60 bg-surface/30 px-4 py-2 text-muted font-medium transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Link href="/job" className="cta-secondary rounded-md border border-border/60 bg-surface/30 px-4 py-2 text-muted font-medium transition-colors hover:text-foreground">
              Roles
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
