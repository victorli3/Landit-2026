import type { EvaluationResult, QuestionBlock, TechnicalAnalysis } from "@/types/interviewos";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp0to10(n: number) {
  return Math.max(0, Math.min(10, n));
}

function pickKeywords(text: string) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const stop = new Set([
    "the",
    "and",
    "or",
    "to",
    "a",
    "of",
    "in",
    "for",
    "with",
    "on",
    "is",
    "are",
    "as",
    "you",
    "we",
    "our",
    "your",
    "will",
    "be",
    "an",
  ]);

  const freq = new Map<string, number>();
  for (const w of cleaned) {
    if (w.length < 4) continue;
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

export async function mockGenerateQuestions(jobDescription: string): Promise<QuestionBlock[]> {
  await sleep(500);

  const kw = pickKeywords(jobDescription);
  const tags = kw.length ? kw : ["teamwork", "ownership", "impact"];

  const behavioral: QuestionBlock[] = [
    {
      id: "b1",
      category: "Behavioral",
      text: "Tell me about a time you handled a tough deadline. What did you do?",
      tags: ["deadline", "planning"],
    },
    {
      id: "b2",
      category: "Behavioral",
      text: "Describe a situation where you disagreed with a teammate. How did you resolve it?",
      tags: ["conflict", "communication"],
    },
    {
      id: "b3",
      category: "Behavioral",
      text: "Tell me about a time you made a mistake. What did you learn?",
      tags: ["learning", "accountability"],
    },
    {
      id: "b4",
      category: "Behavioral",
      text: "Share an example where you took ownership without being asked.",
      tags: ["ownership"],
    },
    {
      id: "b5",
      category: "Behavioral",
      text: "What’s a project you’re proud of, and why?",
      tags: ["impact"],
    },
  ];

  const roleSkill: QuestionBlock[] = [
    {
      id: "r1",
      category: "Role/Skill",
      text: `Based on this role, how would you approach ${tags[0]} and measure success?`,
      tags: [tags[0]],
    },
    {
      id: "r2",
      category: "Role/Skill",
      text: `Walk me through a time you used ${tags[1] ?? tags[0]} to improve a result.`,
      tags: [tags[1] ?? tags[0]],
    },
    {
      id: "r3",
      category: "Role/Skill",
      text: `If you joined tomorrow, what would your first 30 days look like for ${tags[2] ?? tags[0]}?`,
      tags: [tags[2] ?? tags[0]],
    },
  ];

  return [...behavioral, ...roleSkill];
}

export async function mockEvaluateAnswer(args: {
  jobDescription: string;
  question: string;
  answer: string;
}): Promise<EvaluationResult> {
  await sleep(650);

  const len = args.answer.trim().length;
  const hasNumbers = /\d/.test(args.answer);
  const hasStructureWords = /(situation|task|action|result|impact)/i.test(args.answer);

  const base = clamp0to10(Math.round((len / 400) * 10));
  const structure = clamp0to10(base + (hasStructureWords ? 2 : 0));
  const clarity = clamp0to10(base - (len > 1200 ? 2 : 0));
  const impact = clamp0to10(base + (hasNumbers ? 2 : 0));
  const confidence = clamp0to10(base + (len > 120 ? 1 : -1));
  const concision = clamp0to10(base + (len < 600 ? 2 : -1));

  const overall = clamp0to10(Math.round((structure + clarity + impact + confidence + concision) / 5));

  const suggestions = [
    hasStructureWords
      ? "Nice: your answer has a clear structure. Keep that rhythm."
      : "Use a simple structure: Situation → Task → Action → Result.",
    hasNumbers
      ? "Good: you included measurable impact. Keep using metrics."
      : "Add 1–2 concrete metrics (time saved, % improvement, scale).",
    len < 200
      ? "Add a bit more detail so your actions are clear."
      : "Trim extra context—keep it tight and focused.",
  ].slice(0, 5);

  const keyword = pickKeywords(args.jobDescription)[0] ?? "the role";
  const improvedSample =
    "Stronger sample (short):\n\n" +
    `Situation: I was working on a ${keyword}-related problem.\n` +
    "Action: I chose 1–2 high-impact steps and communicated progress clearly.\n" +
    "Result: We shipped on time and improved the outcome with measurable impact.\n" +
    "Tie-back: This shows ownership, clarity, and results.";

  return {
    overall,
    radar: { structure, clarity, impact, confidence, concision },
    suggestions,
    improvedSample,
    evaluatedAtIso: new Date().toISOString(),
  };
}

/* ── Technical analysis ───────────────────────────── */

const TECHNICAL_KEYWORDS = [
  "software engineer",
  "swe",
  "data structures",
  "algorithms",
  "coding interview",
  "leetcode",
  "competitive programming",
  "system design",
  "object-oriented",
  "backend engineer",
  "frontend engineer",
  "full stack engineer",
  "full-stack engineer",
  "developer",
];

const MOCK_LEETCODE_QUESTIONS = [
  {
    title: "Two Sum",
    difficulty: "Easy" as const,
    link: "https://leetcode.com/problems/two-sum/",
  },
  {
    title: "Merge Intervals",
    difficulty: "Medium" as const,
    link: "https://leetcode.com/problems/merge-intervals/",
  },
  {
    title: "LRU Cache",
    difficulty: "Medium" as const,
    link: "https://leetcode.com/problems/lru-cache/",
  },
  {
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium" as const,
    link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
  },
  {
    title: "Trapping Rain Water",
    difficulty: "Hard" as const,
    link: "https://leetcode.com/problems/trapping-rain-water/",
  },
];

export async function mockTechnicalAnalysis(
  jobDescription: string,
): Promise<TechnicalAnalysis> {
  await sleep(900);

  const lower = jobDescription.toLowerCase();
  const isTechnical = TECHNICAL_KEYWORDS.some((kw) => lower.includes(kw));

  if (isTechnical) {
    return {
      hasTechnical: true,
      summary:
        "This role includes a traditional algorithmic coding interview. " +
        "Expect 1–2 rounds of live coding focused on data structures and algorithms. " +
        "Common topics include arrays, hash maps, trees, graphs, and dynamic programming. " +
        "You will likely be evaluated on problem decomposition, code quality, and time/space complexity analysis. " +
        "Some companies also include a system design round for mid-to-senior level candidates. " +
        "Practice under timed conditions to simulate the real interview environment.",
      leetcodeQuestions: MOCK_LEETCODE_QUESTIONS,
    };
  }

  return {
    hasTechnical: false,
    summary:
      "Based on the job description, this role does not appear to include a traditional LeetCode-style algorithmic coding interview. " +
      "Instead, technical evaluation may focus on domain-specific knowledge, portfolio review, or practical assessments. " +
      "Many non-engineering roles assess technical thinking through case studies, system design discussions, or take-home projects. " +
      "Focus your preparation on demonstrating applied expertise relevant to the role.",
    leetcodeQuestions: [],
    preparationTips: [
      "Review system design fundamentals and be ready to discuss architecture trade-offs at a high level.",
      "Prepare a portfolio walkthrough highlighting projects that align with the role's core responsibilities.",
      "Practice structured case-study responses that showcase analytical and product thinking skills.",
    ],
  };
}
