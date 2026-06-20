import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEvents, saveEvents, getTaskDefinitions, getDepartments, saveDepartments,
  getUsers, resolveEvent, newId, nowIso,
} from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const events = getEvents().filter((e) => e.deletedAt === null);
    const users = getUsers();
    const depts = getDepartments();
    const resolved = events
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((e) => resolveEvent(e, users, depts));
    return NextResponse.json(resolved);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const {
      name, employeeId, email, mobilePhone, teamsPhone,
      eventType, targetDate, deadline, departmentName, note, isPending,
    } = await req.json();

    if (!name?.trim() || !eventType?.trim())
      return NextResponse.json({ error: "氏名とイベント種別は必須です" }, { status: 400 });

    // 部署を upsert
    let departmentId: string | null = null;
    if (departmentName?.trim()) {
      const depts = getDepartments();
      let dept = depts.find((d) => d.name === departmentName.trim());
      if (!dept) {
        dept = { id: newId(), name: departmentName.trim(), sortOrder: depts.length };
        depts.push(dept);
        saveDepartments(depts);
      }
      departmentId = dept.id;
    }

    // タスクを生成
    const taskDefs = getTaskDefinitions().filter(
      (d) => d.eventType === eventType && d.isActive
    ).sort((a, b) => a.sortOrder - b.sortOrder);

    const now = nowIso();
    const eventId = newId();
    const tasks = taskDefs.map((def) => ({
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

    const newEvent = {
      id: eventId,
      name: name.trim(),
      employeeId: employeeId?.trim() || null,
      email: email?.trim() || null,
      mobilePhone: mobilePhone?.trim() || null,
      teamsPhone: teamsPhone?.trim() || null,
      eventType,
      departmentId,
      targetDate: targetDate || null,
      deadline: deadline || null,
      isPending: isPending ?? false,
      note: note?.trim() || null,
      createdById: session.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      tasks,
    };

    const events = getEvents();
    events.push(newEvent);
    saveEvents(events);

    const users = getUsers();
    const depts = getDepartments();
    return NextResponse.json(resolveEvent(newEvent, users, depts), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
