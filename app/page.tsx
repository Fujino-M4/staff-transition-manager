"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import {
  Check, Hash, Building2, Calendar, MessageSquare, Plus, Trash2, Settings,
  Download, Upload, X, LogOut, Eye, EyeOff, ChevronUp, ChevronDown, Clock, PauseCircle, Pencil, Search, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ===== 型定義 =====

type TaskCategory = "DXS" | "AIM" | "HR" | "GA";
type StatusType = "未対応" | "対応中" | "完了" | "保留中";

type DbUser = {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
};

type DbEventTask = {
  id: string;
  category: TaskCategory;
  label: string;
  sortOrder: number;
  isDone: boolean;
  doneAt: string | null;
  doneBy: { displayName: string } | null;
  memo: string | null;
  memoUpdatedBy: { displayName: string } | null;
  memoUpdatedAt: string | null;
};

type DbHrEvent = {
  id: string;
  name: string;
  employeeId: string | null;
  email: string | null;
  mobilePhone: string | null;
  teamsPhone: string | null;
  eventType: string;
  targetDate: string | null;
  deadline: string | null;
  isPending: boolean;
  note: string | null;
  createdAt: string;
  department: { id: string; name: string } | null;
  tasks: DbEventTask[];
};

type DbTaskDefinition = {
  id: string;
  eventType: string;
  category: TaskCategory;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type DbDepartment = {
  id: string;
  name: string;
};

type DbEventTypeDefinition = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

// ===== スタイル定数 =====

const CATEGORY_STYLE: Record<TaskCategory, string> = {
  DXS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  AIM: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  HR:  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  GA:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const STATUS_STYLE: Record<StatusType, string> = {
  未対応: "bg-muted text-muted-foreground",
  対応中: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  完了:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  保留中: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const TYPE_COLORS: Record<string, string> = {
  入社:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  退社:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  社内異動: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  帰任:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function getTypeStyle(eventType: string): string {
  return TYPE_COLORS[eventType] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

const CATEGORIES: TaskCategory[] = ["DXS", "AIM", "HR", "GA"];

function computeStatus(tasks: DbEventTask[], isPending: boolean): StatusType {
  if (isPending) return "保留中";
  if (tasks.length === 0) return "未対応";
  const done = tasks.filter((t) => t.isDone).length;
  if (done === 0) return "未対応";
  if (done === tasks.length) return "完了";
  return "対応中";
}

// ===== ページコンポーネント =====

export default function Page() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [users, setUsers] = useState<DbUser[]>([]);

  const [events, setEvents] = useState<DbHrEvent[]>([]);
  const [taskDefinitions, setTaskDefinitions] = useState<DbTaskDefinition[]>([]);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [eventTypes, setEventTypes] = useState<DbEventTypeDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("全件");
  const [typeFilter, setTypeFilter] = useState<string>("全件");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbHrEvent | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedEvents, setTrashedEvents] = useState<DbHrEvent[]>([]);

  // ===== データ取得 =====

  const refreshEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }, []);

  const refreshDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    if (res.ok) setDepartments(await res.json());
  }, []);

  const refreshTaskDefinitions = useCallback(async () => {
    const res = await fetch("/api/task-definitions");
    if (res.ok) setTaskDefinitions(await res.json());
  }, []);

  const refreshUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  const refreshEventTypes = useCallback(async () => {
    const res = await fetch("/api/event-types");
    if (res.ok) setEventTypes(await res.json());
  }, []);

  const refreshTrash = useCallback(async () => {
    const res = await fetch("/api/events/trash");
    if (res.ok) setTrashedEvents(await res.json());
  }, []);

  const fetchAll = useCallback(
    async (isAdmin: boolean) => {
      await Promise.all([
        refreshEvents(),
        refreshDepartments(),
        refreshTaskDefinitions(),
        refreshEventTypes(),
        refreshTrash(),
        ...(isAdmin ? [refreshUsers()] : []),
      ]);
    },
    [refreshEvents, refreshDepartments, refreshTaskDefinitions, refreshEventTypes, refreshTrash, refreshUsers]
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (user: DbUser | null) => {
        setCurrentUser(user);
        if (user) await fetchAll(user.isAdmin);
        setAuthReady(true);
      });
  }, [fetchAll]);

  useEffect(() => {
    if (showTrash) refreshTrash();
  }, [showTrash, refreshTrash]);

  // ===== 認証 =====

  const login = async (username: string, password: string): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;
    const user: DbUser = await res.json();
    setCurrentUser(user);
    await fetchAll(user.isAdmin);
    return true;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setEvents([]);
    setDepartments([]);
    setTaskDefinitions([]);
    setEventTypes([]);
    setUsers([]);
  };

  // ===== ユーザー管理 =====

  const addUser = async (data: {
    username: string;
    password: string;
    displayName: string;
    isAdmin: boolean;
  }): Promise<Response> => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) await refreshUsers();
    return res;
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    await refreshUsers();
  };

  // ===== イベント種別操作 =====

  const addEventType = async (name: string): Promise<Response> => {
    const res = await fetch("/api/event-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) await refreshEventTypes();
    return res;
  };

  const deleteEventType = async (id: string): Promise<Response> => {
    const res = await fetch(`/api/event-types/${id}`, { method: "DELETE" });
    if (res.ok) await refreshEventTypes();
    return res;
  };

  // ===== イベント操作 =====

  const addEvent = async (data: {
    name: string;
    employeeId?: string;
    email?: string;
    mobilePhone?: string;
    teamsPhone?: string;
    eventType: string;
    targetDate?: string;
    deadline?: string;
    departmentName?: string;
    note?: string;
    isPending?: boolean;
  }) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newEvent: DbHrEvent = await res.json();
      await Promise.all([refreshEvents(), refreshDepartments()]);
      setSelectedId(newEvent.id);
      setSelectedTaskId(null);
    }
  };

  // ゴミ箱へ移動（ソフト削除）
  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ softDelete: true }),
    });
    if (!res.ok) { alert("ゴミ箱への移動に失敗しました"); return; }
    const remaining = events.filter((e) => e.id !== id);
    setEvents(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? "");
      setSelectedTaskId(null);
    }
    await refreshTrash();
  };

  // ゴミ箱から復元
  const restoreEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    if (!res.ok) { alert("復元に失敗しました"); return; }
    setTrashedEvents((prev) => prev.filter((e) => e.id !== id));
    await refreshEvents();
  };

  // 完全削除
  const permanentDeleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("完全削除に失敗しました"); return; }
    setTrashedEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const togglePending = async (event: DbHrEvent) => {
    const newPending = !event.isPending;
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, isPending: newPending } : e))
    );
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPending: newPending }),
    });
  };

  const updateEvent = async (id: string, data: {
    name?: string;
    employeeId?: string;
    email?: string;
    mobilePhone?: string;
    teamsPhone?: string;
    eventType?: string;
    targetDate?: string;
    deadline?: string;
    departmentName?: string;
    note?: string;
  }): Promise<boolean> => {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated: DbHrEvent = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      await refreshDepartments();
      return true;
    }
    return false;
  };

  // ===== タスク操作 =====

  const toggleTask = async (eventId: string, task: DbEventTask) => {
    const newDone = !task.isDone;
    setEvents((prev) =>
      prev.map((e) =>
        e.id !== eventId
          ? e
          : {
              ...e,
              tasks: e.tasks.map((t) =>
                t.id !== task.id
                  ? t
                  : {
                      ...t,
                      isDone: newDone,
                      doneBy: newDone ? { displayName: currentUser!.displayName } : null,
                    }
              ),
            }
      )
    );
    await fetch(`/api/events/${eventId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: newDone }),
    });
  };

  const updateTaskMemo = async (eventId: string, taskId: string, memo: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id !== eventId
          ? e
          : {
              ...e,
              tasks: e.tasks.map((t) =>
                t.id !== taskId
                  ? t
                  : {
                      ...t,
                      memo: memo || null,
                      memoUpdatedBy: memo.trim()
                        ? { displayName: currentUser!.displayName }
                        : null,
                    }
              ),
            }
      )
    );
    await fetch(`/api/events/${eventId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    });
  };

  // ===== タスク定義操作 =====

  const addTaskDefinition = async (
    eventType: string,
    category: TaskCategory,
    label: string
  ) => {
    await fetch("/api/task-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, category, label }),
    });
    await refreshTaskDefinitions();
  };

  const deleteTaskDefinition = async (id: string) => {
    await fetch(`/api/task-definitions/${id}`, { method: "DELETE" });
    await refreshTaskDefinitions();
  };

  const moveTaskDefinition = async (id: string, direction: "up" | "down") => {
    await fetch(`/api/task-definitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await refreshTaskDefinitions();
  };

  // ===== 部署操作 =====

  const deleteDepartment = async (id: string) => {
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    await refreshDepartments();
  };

  // ===== CSV エクスポート =====

  const exportEventsCSV = () => {
    const header = "id,name,employeeId,eventType,targetDate,deadline,isPending,status,department,note";
    const rows = events.map((e) => {
      const status = computeStatus(e.tasks, e.isPending);
      return [
        e.id,
        `"${e.name}"`,
        e.employeeId ?? "",
        e.eventType,
        e.targetDate?.slice(0, 10) ?? "",
        e.deadline?.slice(0, 10) ?? "",
        e.isPending ? "保留中" : "",
        status,
        `"${e.department?.name ?? ""}"`,
        `"${e.note ?? ""}"`,
      ].join(",");
    });
    downloadCSV("events.csv", [header, ...rows].join("\n"));
  };

  const exportTaskTemplatesCSV = () => {
    const header = "eventType,id,category,label";
    const rows = taskDefinitions.map((t) =>
      [t.eventType, t.id, t.category, `"${t.label}"`].join(",")
    );
    downloadCSV("task-templates.csv", [header, ...rows].join("\n"));
  };

  const importEventsCSV = async (csv: string): Promise<ImportResult> => {
    const res = await fetch("/api/import/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = await res.json();
    if (res.ok) await Promise.all([refreshEvents(), refreshDepartments()]);
    return { ok: res.ok, ...body };
  };

  const importTaskTemplatesCSV = async (csv: string): Promise<ImportResult> => {
    const res = await fetch("/api/import/task-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = await res.json();
    if (res.ok) await refreshTaskDefinitions();
    return { ok: res.ok, ...body };
  };

  // ===== 選択状態 =====

  const selectedEvent = events.find((e) => e.id === selectedId);

  const getProgress = (event: DbHrEvent) => ({
    done: event.tasks.filter((t) => t.isDone).length,
    total: event.tasks.length,
  });

  const isOverdue = (event: DbHrEvent) => {
    if (!event.deadline) return false;
    const status = computeStatus(event.tasks, event.isPending);
    return new Date(event.deadline) < new Date() && status !== "完了" && !event.isPending;
  };

  const STATUS_FILTERS = ["全件", "未対応", "対応中", "完了", "保留中", "期限切れ"] as const;

  const matchesStatusFilter = (event: DbHrEvent, sf: string) => {
    if (sf === "全件") return true;
    if (sf === "期限切れ") return isOverdue(event);
    return computeStatus(event.tasks, event.isPending) === sf;
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredEvents = events.filter((e) => {
    if (!matchesStatusFilter(e, statusFilter)) return false;
    if (typeFilter !== "全件" && e.eventType !== typeFilter) return false;
    if (q) {
      const hit =
        e.name.toLowerCase().includes(q) ||
        (e.employeeId ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const statusCounts = STATUS_FILTERS.map((sf) => ({
    label: sf,
    count: sf === "全件" ? events.length : events.filter((e) => matchesStatusFilter(e, sf)).length,
  }));

  const typeCounts = [
    { label: "全件", count: events.length },
    ...eventTypes.map((t) => ({
      label: t.name,
      count: events.filter((e) => e.eventType === t.name).length,
    })),
  ];

  const selectedTasksByCategory = selectedEvent
    ? CATEGORIES.map((cat) => ({
        cat,
        tasks: [...selectedEvent.tasks]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .filter((t) => t.category === cat),
      })).filter(({ tasks }) => tasks.length > 0)
    : [];

  const selectedTask = selectedEvent?.tasks.find((t) => t.id === selectedTaskId) ?? null;
  const { done: selDone, total: selTotal } = selectedEvent
    ? getProgress(selectedEvent)
    : { done: 0, total: 0 };
  const selStatus = selectedEvent ? computeStatus(selectedEvent.tasks, selectedEvent.isPending) : "未対応";

  const taskDefsByType: Record<string, DbTaskDefinition[]> = {};
  taskDefinitions.forEach((d) => {
    if (!taskDefsByType[d.eventType]) taskDefsByType[d.eventType] = [];
    taskDefsByType[d.eventType].push(d);
  });

  // ===== 認証ゲート =====

  if (!authReady) return null;
  if (!currentUser) return <LoginPage onLogin={login} />;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* ヘッダー */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="text-sm font-semibold">入退社・異動管理</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">タスク消込</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {currentUser.displayName}
            {currentUser.isAdmin && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                管理者
              </span>
            )}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Settings className="size-3.5" />
            設定
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            ログアウト
          </button>
        </div>
      </header>

      {/* ダイアログ群 */}
      <AddEventDialog
        open={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onAdd={addEvent}
        existingDepartments={departments}
        onDeleteDepartment={deleteDepartment}
        eventTypes={eventTypes}
        onAddEventType={addEventType}
        onDeleteEventType={deleteEventType}
      />
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={(data) => updateEvent(editingEvent.id, data)}
          existingDepartments={departments}
          onDeleteDepartment={deleteDepartment}
          eventTypes={eventTypes}
          onDeleted={() => {
            setEditingEvent(null);
          }}
        />
      )}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        taskDefsByType={taskDefsByType}
        taskDefinitions={taskDefinitions}
        eventTypes={eventTypes}
        onAddTask={addTaskDefinition}
        onDeleteTask={deleteTaskDefinition}
        onMoveTask={moveTaskDefinition}
        onExportEvents={exportEventsCSV}
        onExportTemplates={exportTaskTemplatesCSV}
        onImportEvents={importEventsCSV}
        onImportTemplates={importTaskTemplatesCSV}
        currentUser={currentUser}
        users={users}
        onAddUser={addUser}
        onDeleteUser={deleteUser}
        onAddEventType={addEventType}
        onDeleteEventType={deleteEventType}
      />

      <div className="flex min-h-0 flex-1">
        {/* 左ペイン: フィルター */}
        <nav className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-2">
          {/* 状況 */}
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            状況
          </p>
          {statusCounts.map(({ label, count }) => (
            <button
              key={label}
              type="button"
              onClick={() => { setStatusFilter(label); setShowTrash(false); }}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                statusFilter === label
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                {label !== "全件" && label !== "期限切れ" && (
                  <span className={cn(
                    "inline-block size-1.5 rounded-full",
                    label === "未対応" ? "bg-muted-foreground" :
                    label === "対応中" ? "bg-blue-500" :
                    label === "完了"   ? "bg-green-500" :
                    label === "保留中" ? "bg-yellow-500" : "bg-muted-foreground"
                  )} />
                )}
                {label === "期限切れ" && <span className="text-[10px]">⚠</span>}
                {label}
              </span>
              <span className="tabular-nums text-xs">{count}</span>
            </button>
          ))}

          <Separator className="my-2" />

          {/* イベント種別 */}
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            イベント種別
          </p>
          {typeCounts.map(({ label, count }) => (
            <button
              key={label}
              type="button"
              onClick={() => { setTypeFilter(label); setShowTrash(false); }}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                !showTrash && typeFilter === label
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span>{label}</span>
              <span className="tabular-nums text-xs">{count}</span>
            </button>
          ))}

          <Separator className="my-2" />

          <button
            type="button"
            onClick={() => setShowTrash(true)}
            className={cn(
              "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
              showTrash
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="size-3.5" />
              ゴミ箱
            </span>
            <span className="tabular-nums text-xs">{trashedEvents.length}</span>
          </button>
        </nav>

        {/* 中央ペイン: イベント一覧 */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            <span className="text-xs text-muted-foreground">{filteredEvents.length} 件</span>
            <button
              type="button"
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="size-3" />
              追加
            </button>
          </div>
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前・社員ID・メールで検索"
              className="w-full bg-transparent py-2 pl-8 pr-8 text-xs outline-none placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {showTrash ? (
              <div className="flex flex-col gap-0 p-2">
                {trashedEvents.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">ゴミ箱は空です</p>
                )}
                {trashedEvents.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 rounded-md p-3 hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">{event.name}</span>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        getTypeStyle(event.eventType)
                      )}>
                        {event.eventType}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60">
                      登録 {event.createdAt.slice(0, 10)}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => restoreEvent(event.id)}
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      >
                        <RotateCcw className="size-3" />
                        元に戻す
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`「${event.name}」を完全に削除しますか？この操作は取り消せません。`))
                            permanentDeleteEvent(event.id);
                        }}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" />
                        完全削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-0 p-2">
                {filteredEvents.map((event) => {
                  const { done, total } = getProgress(event);
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const status = computeStatus(event.tasks, event.isPending);
                  const selected = event.id === selectedId;
                  return (
                    <div key={event.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => { setSelectedId(event.id); setSelectedTaskId(null); }}
                        className={cn(
                          "flex w-full flex-col gap-1.5 rounded-md p-3 pr-8 text-left transition-colors",
                          selected ? "bg-accent" : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{event.name}</span>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            STATUS_STYLE[status]
                          )}>
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            getTypeStyle(event.eventType)
                          )}>
                            {event.eventType}
                          </span>
                          {event.targetDate && (
                            <span className="text-xs text-muted-foreground">
                              {event.targetDate.slice(0, 10)}
                            </span>
                          )}
                          {event.deadline && (
                            <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                              <Clock className="size-2.5" />
                              期限 {event.deadline.slice(0, 10)}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground/60">
                          登録 {event.createdAt.slice(0, 10)}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct === 100 ? "bg-green-500" : "bg-primary"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {done}/{total}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                        className="absolute right-2 top-3 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="ゴミ箱へ移動"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 中右ペイン: タスクチェックリスト */}
        {selectedEvent ? (
          <div className="flex min-w-0 flex-1 flex-col border-r border-border">
            <div className="shrink-0 border-b border-border p-4">
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold">{selectedEvent.name}</h1>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  getTypeStyle(selectedEvent.eventType)
                )}>
                  {selectedEvent.eventType}
                </span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_STYLE[selStatus]
                )}>
                  {selStatus}
                </span>
                <button
                  type="button"
                  onClick={() => togglePending(selectedEvent)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                    selectedEvent.isPending
                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <PauseCircle className="size-3" />
                  {selectedEvent.isPending ? "保留中 (解除)" : "保留にする"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(selectedEvent)}
                  className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                  編集
                </button>
              </div>
              <div className="mb-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {selectedEvent.employeeId && (
                  <span className="flex items-center gap-1">
                    <Hash className="size-3.5" />
                    {selectedEvent.employeeId}
                  </span>
                )}
                {selectedEvent.email && (
                  <span className="flex items-center gap-1">
                    <span>✉</span>
                    {selectedEvent.email}
                  </span>
                )}
                {selectedEvent.mobilePhone && (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px]">📱</span>
                    {selectedEvent.mobilePhone}
                  </span>
                )}
                {selectedEvent.teamsPhone && (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px]">☎</span>
                    Teams {selectedEvent.teamsPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {selectedEvent.department?.name ?? "—"}
                </span>
                {selectedEvent.targetDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    実施日 {selectedEvent.targetDate.slice(0, 10)}
                  </span>
                )}
                {selectedEvent.deadline && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="size-3.5" />
                    期限 {selectedEvent.deadline.slice(0, 10)}
                  </span>
                )}
              </div>
              <div className="mb-2 text-xs text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  登録 {selectedEvent.createdAt.slice(0, 10)}
                </span>
              </div>
              {selectedEvent.note && (
                <p className="mb-3 border-l-2 border-muted pl-2 text-xs text-muted-foreground">
                  {selectedEvent.note}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      selDone === selTotal && selTotal > 0 ? "bg-green-500" : "bg-primary"
                    )}
                    style={{
                      width: selTotal > 0 ? `${Math.round((selDone / selTotal) * 100)}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {selDone}/{selTotal} 完了
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6 p-4">
                {selectedTasksByCategory.map(({ cat, tasks }, i) => (
                  <div key={cat}>
                    {i > 0 && <Separator className="mb-6" />}
                    <TaskSection
                      label={cat}
                      tasks={tasks}
                      onToggle={(task) => toggleTask(selectedEvent.id, task)}
                      selectedTaskId={selectedTaskId}
                      onSelectTask={setSelectedTaskId}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center border-r border-border text-sm text-muted-foreground">
            左のリストからイベントを選択してください
          </div>
        )}

        {/* 右ペイン: タスクメモ */}
        <div className="flex w-80 shrink-0 flex-col">
          {selectedEvent && selectedTask ? (
            <>
              <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
                <MessageSquare className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">メモ</span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    CATEGORY_STYLE[selectedTask.category]
                  )}>
                    {selectedTask.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{selectedEvent.name}</span>
                </div>
                <p className="text-sm font-medium leading-snug">{selectedTask.label}</p>
                <Separator />
                <Textarea
                  placeholder={"イレギュラーな対応や状況を記録\n（例：○○のため、対応不要）"}
                  value={selectedTask.memo ?? ""}
                  onChange={(e) =>
                    updateTaskMemo(selectedEvent.id, selectedTask.id, e.target.value)
                  }
                  className="min-h-[220px] resize-none text-sm"
                />
                {selectedTask.memoUpdatedBy && (
                  <p className="text-[11px] text-muted-foreground">
                    最終更新: {selectedTask.memoUpdatedBy.displayName}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="size-8 text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">
                タスク行をクリックして
                <br />
                メモを記録できます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== タスクセクション =====

function TaskSection({
  label,
  tasks,
  onToggle,
  selectedTaskId,
  onSelectTask,
}: {
  label: string;
  tasks: DbEventTask[];
  onToggle: (task: DbEventTask) => void;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const doneCount = tasks.filter((t) => t.isDone).length;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {doneCount}/{tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => {
          const isSelected = selectedTaskId === task.id;
          const hasMemo = !!task.memo?.trim();
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50",
                task.isDone && !isSelected && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
                  task.isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50 bg-background hover:border-primary/70"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(task);
                }}
              >
                {task.isDone && <Check className="size-3" />}
              </span>
              <span
                className={cn(
                  "flex-1",
                  task.isDone && "line-through decoration-muted-foreground/50"
                )}
              >
                {task.label}
              </span>
              {hasMemo && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <MessageSquare className="size-2.5" />
                  {task.memoUpdatedBy?.displayName ?? "メモ"}
                </span>
              )}
              {task.isDone && task.doneBy && (
                <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {task.doneBy.displayName}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ===== ユーティリティ =====

function downloadCSV(filename: string, content: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ImportResult = {
  ok: boolean;
  created?: number;
  updated?: number;
  errors?: string[];
  error?: string;
};

function formatImportResult(result: ImportResult): string {
  if (!result.ok) return result.error ?? "インポートに失敗しました";
  const parts = [`新規 ${result.created ?? 0} 件`, `更新 ${result.updated ?? 0} 件`];
  if (result.errors && result.errors.length > 0) {
    parts.push(`警告 ${result.errors.length} 件`);
  }
  return parts.join("、");
}

function ImportCSVRow({
  title,
  subtitle,
  accept,
  onImport,
}: {
  title: string;
  subtitle: string;
  accept: string;
  onImport: (csv: string) => Promise<ImportResult>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const text = await file.text();
      const result = await onImport(text);
      setStatus({
        message: formatImportResult(result),
        isError: !result.ok,
      });
    } catch {
      setStatus({ message: "インポートに失敗しました", isError: true });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {loading ? "取り込み中…" : "インポート"}
          </button>
        </div>
      </div>
      {status && (
        <p className={cn("text-xs", status.isError ? "text-destructive" : "text-muted-foreground")}>
          {status.message}
        </p>
      )}
    </div>
  );
}

// ===== イベント追加ダイアログ =====

function AddEventDialog({
  open,
  onClose,
  onAdd,
  existingDepartments,
  onDeleteDepartment,
  eventTypes,
  onAddEventType,
  onDeleteEventType,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    employeeId?: string;
    email?: string;
    mobilePhone?: string;
    teamsPhone?: string;
    eventType: string;
    targetDate?: string;
    deadline?: string;
    departmentName?: string;
    note?: string;
    isPending?: boolean;
  }) => void;
  existingDepartments: DbDepartment[];
  onDeleteDepartment: (id: string) => void;
  eventTypes: DbEventTypeDefinition[];
  onAddEventType: (name: string) => Promise<Response>;
  onDeleteEventType: (id: string) => Promise<Response>;
}) {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [teamsPhone, setTeamsPhone] = useState("");
  const [eventType, setEventType] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [note, setNote] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [typeError, setTypeError] = useState("");
  const [showTypeManager, setShowTypeManager] = useState(false);

  // 初回オープン時にイベント種別の先頭をデフォルト選択
  useEffect(() => {
    if (open && eventTypes.length > 0 && !eventType) {
      setEventType(eventTypes[0].name);
    }
  }, [open, eventTypes, eventType]);

  const resetForm = () => {
    setName(""); setEmployeeId(""); setEmail(""); setMobilePhone(""); setTeamsPhone("");
    setEventType(eventTypes[0]?.name ?? "");
    setTargetDate(""); setDeadline(""); setDepartmentName(""); setNote("");
    setNewTypeName(""); setTypeError(""); setShowTypeManager(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = () => {
    if (!name.trim() || !eventType) return;
    onAdd({
      name: name.trim(),
      employeeId: employeeId.trim() || undefined,
      email: email.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
      teamsPhone: teamsPhone.trim() || undefined,
      eventType,
      targetDate: targetDate || undefined,
      deadline: deadline || undefined,
      departmentName: departmentName.trim() || undefined,
      note: note.trim() || undefined,
    });
    resetForm();
    onClose();
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    const res = await onAddEventType(newTypeName.trim());
    if (!res.ok) {
      const body = await res.json();
      setTypeError(body.error ?? "エラーが発生しました");
    } else {
      setNewTypeName("");
      setTypeError("");
    }
  };

  const handleDeleteType = async (id: string, typeName: string) => {
    const res = await onDeleteEventType(id);
    if (!res.ok) {
      const body = await res.json();
      setTypeError(body.error ?? "削除できませんでした");
    } else {
      if (eventType === typeName) setEventType(eventTypes.find((t) => t.id !== id)?.name ?? "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>イベント追加</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {/* 氏名 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">氏名 *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" />
          </div>

          {/* 社員ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">社員ID</label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="000000" />
          </div>

          {/* メールアドレス */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tar.yamada@xxx.co.jp" />
          </div>

          {/* 携帯番号 / TeamsPhone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">携帯番号</label>
              <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="090-0000-0000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">TeamsPhone</label>
              <Input value={teamsPhone} onChange={(e) => setTeamsPhone(e.target.value)} placeholder="03-0000-0000" />
            </div>
          </div>

          {/* イベント種別 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">イベント種別 *</label>
              <button
                type="button"
                onClick={() => setShowTypeManager((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {showTypeManager ? "閉じる" : "種別を管理"}
              </button>
            </div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {eventTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>

            {/* 種別管理パネル */}
            {showTypeManager && (
              <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">イベント種別の追加・削除</p>
                {eventTypes.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t.createdAt.slice(0, 10)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteType(t.id, t.name)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="削除"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddType(); }}
                    placeholder="新しい種別名"
                    className="h-7 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    disabled={!newTypeName.trim()}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="size-3" />
                    追加
                  </button>
                </div>
                {typeError && <p className="text-[11px] text-destructive">{typeError}</p>}
              </div>
            )}
          </div>

          {/* イベント実施日 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">イベント実施日</label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          {/* 期限 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">期限</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          {/* 部署 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">部署</label>
            <DepartmentAutocomplete
              value={departmentName}
              onChange={setDepartmentName}
              suggestions={existingDepartments}
              onDelete={onDeleteDepartment}
            />
          </div>

          {/* 備考 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">備考</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意メモ" />
          </div>

        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || !eventType}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            追加
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 設定ダイアログ =====

function SettingsDialog({
  open,
  onClose,
  taskDefsByType,
  taskDefinitions,
  eventTypes,
  onAddTask,
  onDeleteTask,
  onMoveTask,
  onExportEvents,
  onExportTemplates,
  onImportEvents,
  onImportTemplates,
  currentUser,
  users,
  onAddUser,
  onDeleteUser,
  onAddEventType,
  onDeleteEventType,
}: {
  open: boolean;
  onClose: () => void;
  taskDefsByType: Record<string, DbTaskDefinition[]>;
  taskDefinitions: DbTaskDefinition[];
  eventTypes: DbEventTypeDefinition[];
  onAddTask: (type: string, category: TaskCategory, label: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, direction: "up" | "down") => void;
  onExportEvents: () => void;
  onExportTemplates: () => void;
  onImportEvents: (csv: string) => Promise<ImportResult>;
  onImportTemplates: (csv: string) => Promise<ImportResult>;
  currentUser: DbUser;
  users: DbUser[];
  onAddUser: (data: { username: string; password: string; displayName: string; isAdmin: boolean }) => Promise<Response>;
  onDeleteUser: (id: string) => void;
  onAddEventType: (name: string) => Promise<Response>;
  onDeleteEventType: (id: string) => Promise<Response>;
}) {
  const [tab, setTab] = useState<"tasks" | "event-types" | "io" | "users">("tasks");
  const [activeType, setActiveType] = useState<string>("");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("DXS");

  // activeType が空なら eventTypes の先頭に合わせる
  useEffect(() => {
    if (activeType === "" && eventTypes.length > 0) {
      setActiveType(eventTypes[0].name);
    }
  }, [activeType, eventTypes]);

  const activeTasks = (taskDefsByType[activeType] ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAddTask = () => {
    if (!newLabel.trim() || !activeType) return;
    onAddTask(activeType, newCategory, newLabel.trim());
    setNewLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
        </DialogHeader>

        <div className="flex gap-0 border-b border-border">
          {([
            "tasks",
            "io",
            ...(currentUser.isAdmin ? ["event-types", "users"] : []),
          ] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t as typeof tab)}
              className={cn(
                "px-4 py-2 text-sm transition-colors",
                tab === t
                  ? "border-b-2 border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "tasks" ? "タスク項目管理"
                : t === "event-types" ? "イベント種別"
                : t === "io" ? "入出力"
                : "ユーザー管理"}
            </button>
          ))}
        </div>

        {tab === "tasks" && (
          <div className="flex min-h-[360px] gap-4">
            <div className="flex w-28 shrink-0 flex-col gap-0.5 border-r border-border pr-3">
              {eventTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveType(t.name)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    activeType === t.name
                      ? "bg-accent font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {t.name}
                  <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
                    {taskDefsByType[t.name]?.length ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-60 overflow-y-auto">
                <div className="flex flex-col gap-0.5 pr-2">
                  {activeTasks.map((task, idx, arr) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                    >
                      <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMoveTask(task.id, "up")}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => onMoveTask(task.id, "down")}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                        >
                          <ChevronDown className="size-3" />
                        </button>
                      </div>
                      <span className={cn(
                        "inline-flex w-8 shrink-0 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-medium",
                        CATEGORY_STYLE[task.category]
                      )}>
                        {task.category}
                      </span>
                      <span className="flex-1 text-sm">{task.label}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {activeTasks.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      タスクがありません
                    </p>
                  )}
                </div>
              </div>

              <Separator />
              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                  className="flex h-8 w-16 shrink-0 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="DXS">DXS</option>
                  <option value="AIM">AIM</option>
                  <option value="HR">HR</option>
                  <option value="GA">GA</option>
                </select>
                <TaskLabelAutocomplete
                  value={newLabel}
                  onChange={setNewLabel}
                  onSubmit={handleAddTask}
                  taskDefinitions={taskDefinitions}
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newLabel.trim()}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="size-3" />
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "event-types" && currentUser.isAdmin && (
          <EventTypeManagementTab
            eventTypes={eventTypes}
            onAddEventType={onAddEventType}
            onDeleteEventType={onDeleteEventType}
          />
        )}

        {tab === "io" && (
          <div className="flex min-h-[360px] flex-col gap-6 py-2">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">インポート</p>
                <p className="text-xs text-muted-foreground">
                  エクスポートした CSV を取り込みます（同じ id の行は更新、それ以外は新規追加）
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <ImportCSVRow
                  title="イベント一覧"
                  subtitle="events.csv — 対象者データ"
                  accept=".csv,text/csv"
                  onImport={onImportEvents}
                />
                {currentUser.isAdmin && (
                  <ImportCSVRow
                    title="タスクテンプレート"
                    subtitle="task-templates.csv — タスク項目定義"
                    accept=".csv,text/csv"
                    onImport={onImportTemplates}
                  />
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">エクスポート</p>
                <p className="text-xs text-muted-foreground">
                  現在のデータをCSVとして書き出します（Excel・スプレッドシートで開けます）
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">イベント一覧</p>
                    <p className="text-xs text-muted-foreground">events.csv — 対象者データ</p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportEvents}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="size-3.5" />
                    ダウンロード
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">タスクテンプレート</p>
                    <p className="text-xs text-muted-foreground">task-templates.csv — タスク項目定義</p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportTemplates}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="size-3.5" />
                    ダウンロード
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && currentUser.isAdmin && (
          <UserManagementTab
            users={users}
            currentUser={currentUser}
            onAddUser={onAddUser}
            onDeleteUser={onDeleteUser}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== イベント種別管理タブ =====

function EventTypeManagementTab({
  eventTypes,
  onAddEventType,
  onDeleteEventType,
}: {
  eventTypes: DbEventTypeDefinition[];
  onAddEventType: (name: string) => Promise<Response>;
  onDeleteEventType: (id: string) => Promise<Response>;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const res = await onAddEventType(newName.trim());
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "エラーが発生しました");
    } else {
      setNewName("");
      setError("");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const res = await onDeleteEventType(id);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? `「${name}」の削除に失敗しました`);
    } else {
      setError("");
    }
  };

  return (
    <div className="flex min-h-[360px] flex-col gap-4 py-2">
      <p className="text-xs text-muted-foreground">
        イベント種別を管理します。使用中の種別は削除できません。
      </p>

      <div className="flex flex-col gap-1">
        {eventTypes.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">
              作成 {t.createdAt.slice(0, 10)}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(t.id, t.name)}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
              aria-label="削除"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">新しい種別を追加</p>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="例：業務委託、役員就任"
            className="h-8 text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-3" />
            追加
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ===== ユーザー管理タブ =====

function UserManagementTab({
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
}: {
  users: DbUser[];
  currentUser: DbUser;
  onAddUser: (data: { username: string; password: string; displayName: string; isAdmin: boolean }) => Promise<Response>;
  onDeleteUser: (id: string) => void;
}) {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) return;
    const res = await onAddUser({
      username: newUsername.trim(),
      password: newPassword.trim(),
      displayName: newDisplayName.trim(),
      isAdmin: newIsAdmin,
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "エラーが発生しました");
      return;
    }
    setNewUsername(""); setNewPassword(""); setNewDisplayName(""); setNewIsAdmin(false); setError("");
  };

  return (
    <div className="flex min-h-[360px] flex-col gap-4 py-2">
      <p className="text-xs text-muted-foreground">
        登録ユーザーを管理します。IDとパスワードを本人に伝えてください。
      </p>

      <div className="flex flex-col gap-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {u.displayName.slice(0, 1)}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium">{u.displayName}</span>
              <span className="text-xs text-muted-foreground">ID: {u.username}</span>
            </div>
            {u.isAdmin && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                管理者
              </span>
            )}
            <button
              type="button"
              disabled={u.id === currentUser.id}
              onClick={() => onDeleteUser(u.id)}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="削除"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">新規ユーザーを追加</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="表示名（例：田中 次郎）"
            className="h-8 text-sm"
          />
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="ログインID（例：tanaka）"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="パスワード"
              className="h-8 pr-8 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="rounded"
            />
            管理者権限
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-3" />
            追加
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ===== ログインページ =====

function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<boolean>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = await onLogin(username, password);
    if (!ok) setError("IDまたはパスワードが正しくありません");
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">入退社・異動管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">ログインしてください</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">ログインID</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: admin"
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">パスワード</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoComplete="current-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!username.trim() || !password.trim() || loading}
            className="rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          アカウントは管理者にお問い合わせください
        </p>
      </div>
    </div>
  );
}

// ===== タスク名オートコンプリート =====

function TaskLabelAutocomplete({
  value,
  onChange,
  onSubmit,
  taskDefinitions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  taskDefinitions: DbTaskDefinition[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const seen = new Set<string>();
  const uniqueDefs = taskDefinitions.filter((d) => {
    if (seen.has(d.label)) return false;
    seen.add(d.label);
    return true;
  });

  const filtered = value.trim()
    ? uniqueDefs.filter((d) =>
        d.label.toLowerCase().includes(value.trim().toLowerCase())
      )
    : uniqueDefs;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSubmit(); setOpen(false); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="タスク名を入力または選択..."
        className="h-8 text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-52 overflow-auto rounded-md border border-border bg-background shadow-md">
          {filtered.map((def) => (
            <button
              key={def.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(def.label);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
            >
              <span className={cn(
                "inline-flex w-8 shrink-0 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-medium",
                CATEGORY_STYLE[def.category]
              )}>
                {def.category}
              </span>
              <span className="flex-1 truncate">{def.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== イベント編集ダイアログ =====

function EditEventDialog({
  event,
  onClose,
  onSave,
  existingDepartments,
  onDeleteDepartment,
  eventTypes,
}: {
  event: DbHrEvent;
  onClose: () => void;
  onSave: (data: {
    name?: string;
    employeeId?: string;
    email?: string;
    mobilePhone?: string;
    teamsPhone?: string;
    eventType?: string;
    targetDate?: string;
    deadline?: string;
    departmentName?: string;
    note?: string;
  }) => Promise<boolean>;
  existingDepartments: DbDepartment[];
  onDeleteDepartment: (id: string) => void;
  eventTypes: DbEventTypeDefinition[];
  onDeleted: () => void;
}) {
  const [name, setName] = useState(event.name);
  const [employeeId, setEmployeeId] = useState(event.employeeId ?? "");
  const [email, setEmail] = useState(event.email ?? "");
  const [mobilePhone, setMobilePhone] = useState(event.mobilePhone ?? "");
  const [teamsPhone, setTeamsPhone] = useState(event.teamsPhone ?? "");
  const [eventType, setEventType] = useState(event.eventType);
  const [targetDate, setTargetDate] = useState(event.targetDate?.slice(0, 10) ?? "");
  const [deadline, setDeadline] = useState(event.deadline?.slice(0, 10) ?? "");
  const [departmentName, setDepartmentName] = useState(event.department?.name ?? "");
  const [note, setNote] = useState(event.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !eventType) return;
    setSaving(true);
    setSaveError("");
    const ok = await onSave({
      name: name.trim(),
      employeeId: employeeId.trim(),
      email: email.trim(),
      mobilePhone: mobilePhone.trim(),
      teamsPhone: teamsPhone.trim(),
      eventType,
      targetDate: targetDate || "",
      deadline: deadline || "",
      departmentName: departmentName.trim(),
      note: note.trim(),
    });
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setSaveError("保存に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>イベント情報を編集</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">氏名 *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">社員ID</label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="000000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tar.yamada@xxx.co.jp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">携帯番号</label>
              <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="090-0000-0000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">TeamsPhone</label>
              <Input value={teamsPhone} onChange={(e) => setTeamsPhone(e.target.value)} placeholder="03-0000-0000" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">イベント種別 *</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {eventTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">イベント実施日</label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">期限</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">部署</label>
            <DepartmentAutocomplete
              value={departmentName}
              onChange={setDepartmentName}
              suggestions={existingDepartments}
              onDelete={onDeleteDepartment}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">備考</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意メモ" />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !eventType || saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </DialogFooter>
        {saveError && (
          <p className="text-xs text-destructive text-right pr-1">{saveError}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== 部署名オートコンプリート =====

function DepartmentAutocomplete({
  value,
  onChange,
  suggestions,
  onDelete,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: DbDepartment[];
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? suggestions.filter((s) => s.name.toLowerCase().includes(value.trim().toLowerCase()))
    : suggestions;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder="部署名を入力または選択..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-auto rounded-md border border-border bg-background shadow-md">
          {filtered.map((dept) => (
            <div key={dept.id} className="group flex items-center">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(dept.name);
                  setOpen(false);
                }}
                className="flex-1 px-3 py-2 text-left text-sm hover:bg-muted/60"
              >
                {dept.name}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onDelete(dept.id);
                  if (value === dept.name) onChange("");
                }}
                className="px-2 py-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="削除"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
