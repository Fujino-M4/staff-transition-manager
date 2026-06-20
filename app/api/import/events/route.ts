import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseCSVToRecords } from "@/lib/csv";
import {
  getEvents,
  saveEvents,
  getTaskDefinitions,
  getDepartments,
  saveDepartments,
  newId,
  nowIso,
} from "@/lib/db";

const REQUIRED_COLUMNS = ["name", "eventType"];

function parseIsPending(value: string): boolean {
  return value === "保留中" || value.toLowerCase() === "true" || value === "1";
}

function upsertDepartment(departmentName: string): string {
  const depts = getDepartments();
  let dept = depts.find((d) => d.name === departmentName);
  if (!dept) {
    dept = { id: newId(), name: departmentName, sortOrder: depts.length };
    depts.push(dept);
    saveDepartments(depts);
  }
  return dept.id;
}

function buildTasksForEvent(eventId: string, eventType: string, now: string) {
  const taskDefs = getTaskDefinitions()
    .filter((d) => d.eventType === eventType && d.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return taskDefs.map((def) => ({
    id: newId(),
    eventId,
    taskDefId: def.id,
    category: def.category,
    label: def.label,
    sortOrder: def.sortOrder,
    isDone: false,
    doneById: null,
    doneAt: null,
    memo: null,
    memoUpdatedById: null,
    memoUpdatedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { csv } = await req.json();
    if (typeof csv !== "string" || !csv.trim())
      return NextResponse.json({ error: "CSV データがありません" }, { status: 400 });

    const records = parseCSVToRecords(csv);
    if (records.length === 0)
      return NextResponse.json({ error: "インポートする行がありません" }, { status: 400 });

    const missing = REQUIRED_COLUMNS.filter((col) => !(col in records[0]));
    if (missing.length > 0)
      return NextResponse.json(
        { error: `CSV の列が不足しています: ${missing.join(", ")}` },
        { status: 400 }
      );

    const events = getEvents();
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      const row = records[i];
      const { id, name, employeeId, eventType, targetDate, deadline, isPending, department, note } =
        row;

      if (!name || !eventType) {
        errors.push(`${rowNum}行目: name と eventType は必須です`);
        continue;
      }

      const departmentId = department ? upsertDepartment(department) : null;
      const now = nowIso();

      if (id) {
        const idx = events.findIndex((e) => e.id === id);
        if (idx !== -1) {
          events[idx] = {
            ...events[idx],
            name,
            employeeId: employeeId || null,
            eventType,
            targetDate: targetDate || null,
            deadline: deadline || null,
            isPending: parseIsPending(isPending ?? ""),
            note: note || null,
            departmentId,
            updatedAt: now,
          };
          updated++;
          continue;
        }
      }

      const eventId = id || newId();
      events.push({
        id: eventId,
        name,
        employeeId: employeeId || null,
        email: null,
        mobilePhone: null,
        teamsPhone: null,
        eventType,
        departmentId,
        targetDate: targetDate || null,
        deadline: deadline || null,
        isPending: parseIsPending(isPending ?? ""),
        note: note || null,
        createdById: session.userId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        tasks: buildTasksForEvent(eventId, eventType, now),
      });
      created++;
    }

    saveEvents(events);

    return NextResponse.json({ created, updated, errors });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
