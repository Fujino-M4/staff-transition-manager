import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEvents, saveEvents, getDepartments, getUsers, resolveEvent, nowIso } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { id, taskId } = await params;
    const body = await req.json();
    const events = getEvents();
    const eventIdx = events.findIndex((e) => e.id === id);
    if (eventIdx === -1) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });

    const taskIdx = events[eventIdx].tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });

    const now = nowIso();
    const task = { ...events[eventIdx].tasks[taskIdx], updatedAt: now };

    if (typeof body.isDone === "boolean") {
      task.isDone = body.isDone;
      task.doneById = body.isDone ? session.userId : null;
      task.doneAt = body.isDone ? now : null;
    }

    if (typeof body.memo === "string") {
      task.memo = body.memo.trim() || null;
      task.memoUpdatedById = session.userId;
      task.memoUpdatedAt = now;
    }

    events[eventIdx].tasks[taskIdx] = task;
    events[eventIdx] = { ...events[eventIdx], updatedAt: now };
    saveEvents(events);

    const users = getUsers();
    const depts = getDepartments();
    return NextResponse.json(resolveEvent(events[eventIdx], users, depts));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
