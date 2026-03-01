import type { AppState, RoleWorkspace, WorkspaceState } from "@/types/interviewos";

// Reuse the original key so older single-workspace saves can be migrated in-place.
export const APP_STORAGE_KEY = "interviewos.workspace.v1";

export function emptyWorkspace(jobDescription = ""): WorkspaceState {
  return {
    jobDescription,
    questions: [],
    selectedQuestionId: null,
    answersById: {},
    evalsById: {},
  };
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `role_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export function createRole(args: { name: string; workspace: WorkspaceState }): RoleWorkspace {
  const now = new Date().toISOString();
  return {
    id: randomId(),
    name: args.name,
    workspace: args.workspace,
    createdAtIso: now,
    updatedAtIso: now,
  };
}

export function emptyAppState(): AppState {
  return {
    roles: [],
    activeRoleId: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Migrates older saved shapes into AppState.
export function migrateToAppState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return emptyAppState();

  const maybeAny = raw as Record<string, unknown>;

  // Already the new shape
  if (Array.isArray(maybeAny.roles)) {
    return {
      roles: maybeAny.roles as RoleWorkspace[],
      activeRoleId: typeof maybeAny.activeRoleId === "string" ? maybeAny.activeRoleId : null,
    };
  }

  // Old single-workspace shape
  if (typeof maybeAny.jobDescription === "string" && Array.isArray(maybeAny.questions)) {
    const ws: WorkspaceState = {
      jobDescription: maybeAny.jobDescription,
      questions: maybeAny.questions as WorkspaceState["questions"],
      selectedQuestionId: typeof maybeAny.selectedQuestionId === "string" ? maybeAny.selectedQuestionId : null,
      answersById:
        isRecord(maybeAny.answersById) ? (maybeAny.answersById as Record<string, string>) : {},
      evalsById:
        (isRecord(maybeAny.evalsById) ? maybeAny.evalsById : {}) as unknown as WorkspaceState["evalsById"],
    };

    const role = createRole({ name: "Imported role", workspace: ws });
    return {
      roles: [role],
      activeRoleId: role.id,
    };
  }

  return emptyAppState();
}
