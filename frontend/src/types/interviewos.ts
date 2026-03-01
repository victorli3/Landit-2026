export type QuestionCategory = "Behavioral" | "Role/Skill";

export type QuestionBlock = {
  id: string;
  text: string;
  category: QuestionCategory;
  tags?: string[];
};

export type RadarBreakdown = {
  structure: number; // 0-10
  clarity: number; // 0-10
  impact: number; // 0-10
  confidence: number; // 0-10
  concision: number; // 0-10
};

export type EvaluationResult = {
  overall: number; // 0-10
  radar: RadarBreakdown;
  suggestions: string[];
  improvedSample: string;
  evaluatedAtIso: string;
};

export type WorkspaceState = {
  jobDescription: string;
  questions: QuestionBlock[];
  selectedQuestionId: string | null;
  answersById: Record<string, string>;
  evalsById: Record<string, EvaluationResult>;
};

export type RoleWorkspace = {
  id: string;
  name: string;
  workspace: WorkspaceState;
  createdAtIso: string;
  updatedAtIso: string;
};

export type AppState = {
  roles: RoleWorkspace[];
  activeRoleId: string | null;
};

/* ── Technical analysis ─────────────────────────────── */

export type LeetCodeQuestion = {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  link: string;
};

export type TechnicalAnalysis = {
  hasTechnical: boolean;
  summary: string;
  leetcodeQuestions: LeetCodeQuestion[];
  preparationTips?: string[];
};
