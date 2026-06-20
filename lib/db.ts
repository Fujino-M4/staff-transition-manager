import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

export function writeDb<T>(filename: string, data: T): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 25);
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ===== 型定義 =====

export type DbUser = {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
};

export type DbEventType = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type DbDepartment = {
  id: string;
  name: string;
  sortOrder: number;
};

export type DbTaskDefinition = {
  id: string;
  eventType: string;
  category: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

export type DbEventTask = {
  id: string;
  eventId: string;
  taskDefId: string | null;
  category: string;
  label: string;
  sortOrder: number;
  isDone: boolean;
  doneById: string | null;
  doneAt: string | null;
  memo: string | null;
  memoUpdatedById: string | null;
  memoUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbHrEvent = {
  id: string;
  name: string;
  employeeId: string | null;
  email: string | null;
  mobilePhone: string | null;
  teamsPhone: string | null;
  eventType: string;
  departmentId: string | null;
  targetDate: string | null;
  deadline: string | null;
  isPending: boolean;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  tasks: DbEventTask[];
};

// ===== 便利なリード関数 =====

export function getUsers(): DbUser[] {
  return readDb<DbUser[]>("users.json", []);
}
export function saveUsers(users: DbUser[]): void {
  writeDb("users.json", users);
}

export function getEventTypes(): DbEventType[] {
  return readDb<DbEventType[]>("event-types.json", []);
}
export function saveEventTypes(types: DbEventType[]): void {
  writeDb("event-types.json", types);
}

export function getDepartments(): DbDepartment[] {
  return readDb<DbDepartment[]>("departments.json", []);
}
export function saveDepartments(depts: DbDepartment[]): void {
  writeDb("departments.json", depts);
}

export function getTaskDefinitions(): DbTaskDefinition[] {
  return readDb<DbTaskDefinition[]>("task-definitions.json", []);
}
export function saveTaskDefinitions(defs: DbTaskDefinition[]): void {
  writeDb("task-definitions.json", defs);
}

export function getEvents(): DbHrEvent[] {
  return readDb<DbHrEvent[]>("events.json", []);
}
export function saveEvents(events: DbHrEvent[]): void {
  writeDb("events.json", events);
}

// ===== リレーション解決ヘルパー =====
// APIレスポンス用に department / doneBy / memoUpdatedBy を付与する

export type ResolvedEventTask = DbEventTask & {
  doneBy: { displayName: string } | null;
  memoUpdatedBy: { displayName: string } | null;
};

export type ResolvedHrEvent = Omit<DbHrEvent, "tasks"> & {
  department: { id: string; name: string } | null;
  tasks: ResolvedEventTask[];
};

export function resolveEvent(
  event: DbHrEvent,
  users: DbUser[],
  departments: DbDepartment[]
): ResolvedHrEvent {
  const dept = event.departmentId
    ? (departments.find((d) => d.id === event.departmentId) ?? null)
    : null;

  const tasks: ResolvedEventTask[] = event.tasks.map((t) => ({
    ...t,
    doneBy: t.doneById
      ? (users.find((u) => u.id === t.doneById)
          ? { displayName: users.find((u) => u.id === t.doneById)!.displayName }
          : null)
      : null,
    memoUpdatedBy: t.memoUpdatedById
      ? (users.find((u) => u.id === t.memoUpdatedById)
          ? { displayName: users.find((u) => u.id === t.memoUpdatedById)!.displayName }
          : null)
      : null,
  }));

  return {
    ...event,
    department: dept ? { id: dept.id, name: dept.name } : null,
    tasks,
  };
}
