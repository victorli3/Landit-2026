"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardPaste,
  Sparkles,
  MessageSquareText,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ── timing (ms) ─────────────────────────────── */
const PHASE_DURATIONS = [4200, 4800, 5000]; // input → generation → feedback
const TOTAL = PHASE_DURATIONS.reduce((a, b) => a + b, 0);

/* ── mock data ───────────────────────────────── */
const JD_LINES = [
  "Senior Frontend Engineer — Notion",
  "Build performant, accessible UI",
  "React · TypeScript · Next.js",
  "Collaborate with design & product",
];

const QUESTIONS = [
  "Tell me about a complex UI you shipped end-to-end.",
  "How do you handle competing priorities?",
  "Describe a time you improved performance.",
  "Walk me through a tricky debugging story.",
];

const SCORES = [
  { label: "Structure", value: 8.4 },
  { label: "Clarity", value: 9.1 },
  { label: "Impact", value: 7.6 },
  { label: "Confidence", value: 8.8 },
  { label: "Concision", value: 8.0 },
];

const STRENGTHS = ["Clear narrative arc", "Quantified outcomes"];
const WEAKNESSES = ["Could add more context", "Mention team dynamics"];

/* ── animation variants ──────────────────────── */
const phaseVariants = {
  enter: { opacity: 0, y: 18, filter: "blur(4px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.3, ease: "easeIn" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

/* ── sub‑components ──────────────────────────── */

function AnimatedBar({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
        initial={{ width: 0 }}
        animate={{ width: `${(value / 10) * 100}%` }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
      />
    </div>
  );
}

function PulsingGlow() {
  return (
    <motion.div
      className="pointer-events-none absolute -inset-1 rounded-2xl"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)",
      }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ═══════════════════════════════════════════════ */
/*  WorkflowDemo                                    */
/* ═══════════════════════════════════════════════ */

export default function WorkflowDemo() {
  const [phase, setPhase] = useState(0); // 0 input · 1 gen · 2 feedback

  const advance = useCallback(() => {
    setPhase((p) => (p + 1) % 3);
  }, []);

  useEffect(() => {
    const timer = setTimeout(advance, PHASE_DURATIONS[phase]);
    return () => clearTimeout(timer);
  }, [phase, advance]);

  return (
    <div className="relative mx-auto hidden w-full max-w-md lg:block">
      <PulsingGlow />
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-2xl ring-1 ring-white/10"
        style={{ minHeight: 340 }}
      >
        {/* top bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <span className="ml-3 text-[11px] font-medium tracking-wide text-white/30 select-none">
            Landit
          </span>
          {/* phase indicator dots */}
          <div className="ml-auto flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 rounded-full"
                animate={{
                  width: phase === i ? 18 : 6,
                  backgroundColor: phase === i ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.15)",
                }}
                transition={{ duration: 0.35 }}
              />
            ))}
          </div>
        </div>

        {/* phase content */}
        <div className="relative px-5 py-5" style={{ minHeight: 280 }}>
          <AnimatePresence mode="wait">
            {phase === 0 && <InputPhase key="input" />}
            {phase === 1 && <GenerationPhase key="gen" />}
            {phase === 2 && <FeedbackPhase key="feedback" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Phase 0: Input ──────────────────────────── */
function InputPhase() {
  const [lines, setLines] = useState(0);
  const [showBtn, setShowBtn] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    // reveal JD lines one by one
    const timers: ReturnType<typeof setTimeout>[] = [];
    JD_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setLines(i + 1), 400 + i * 450));
    });
    // show generate button after lines
    timers.push(setTimeout(() => setShowBtn(true), 400 + JD_LINES.length * 450 + 300));
    // click the button
    timers.push(setTimeout(() => setClicked(true), 400 + JD_LINES.length * 450 + 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div variants={phaseVariants} initial="enter" animate="center" exit="exit" layout>
      {/* label */}
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/40">
        <ClipboardPaste size={13} />
        <span>Paste Job Description</span>
      </div>

      {/* fake textarea */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 font-mono text-[12px] leading-relaxed text-white/70">
        {JD_LINES.slice(0, lines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            {line}
          </motion.div>
        ))}
        {lines < JD_LINES.length && (
          <motion.span
            className="inline-block h-3.5 w-[2px] bg-indigo-400/80"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.55, repeat: Infinity }}
          />
        )}
      </div>

      {/* generate button */}
      <AnimatePresence>
        {showBtn && (
          <motion.button
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-500/90 px-4 py-2 text-xs font-semibold text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: clicked ? [1, 1.08, 0.96, 1] : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles size={13} />
            Generate Questions
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Phase 1: Generation ─────────────────────── */
function GenerationPhase() {
  return (
    <motion.div variants={phaseVariants} initial="enter" animate="center" exit="exit" layout>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/40">
        <MessageSquareText size={13} />
        <span>Generated Questions</span>
      </div>

      <motion.ul className="space-y-2.5" variants={stagger} initial="hidden" animate="visible">
        {QUESTIONS.map((q, i) => (
          <motion.li
            key={i}
            variants={fadeUp}
            className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-relaxed text-white/75"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
              {i + 1}
            </span>
            {q}
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

/* ── Phase 2: Feedback ───────────────────────── */
function FeedbackPhase() {
  return (
    <motion.div variants={phaseVariants} initial="enter" animate="center" exit="exit" layout>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/40">
        <TrendingUp size={13} />
        <span>Performance Feedback</span>
      </div>

      {/* score bars */}
      <div className="space-y-2.5">
        {SCORES.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-white/50">{s.label}</span>
              <span className="font-semibold text-white/80">{s.value.toFixed(1)}</span>
            </div>
            <AnimatedBar value={s.value} delay={i * 0.1 + 0.15} />
          </motion.div>
        ))}
      </div>

      {/* strengths / weaknesses */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <motion.div
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.7 }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
            <CheckCircle2 size={11} />
            Strengths
          </div>
          {STRENGTHS.map((s) => (
            <p key={s} className="text-[11px] leading-relaxed text-white/55">
              {s}
            </p>
          ))}
        </motion.div>

        <motion.div
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.9 }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
            <AlertTriangle size={11} />
            Improve
          </div>
          {WEAKNESSES.map((w) => (
            <p key={w} className="text-[11px] leading-relaxed text-white/55">
              {w}
            </p>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
