import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getEvents, saveEvents, getDepartments, saveDepartments,
  getUsers, resolveEvent, newId, nowIso,
} from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    const events = getEvents();
    const event = events.find((e) => e.id === id);
    if (!event) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    if (!event.deletedAt)
      return NextResponse.json({ error: "ゴミ箱に入っていないイベントは完全削除できません" }, { status: 400 });

    saveEvents(events.filter((e) => e.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const events = getEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const now = nowIso();

    // ゴミ箱へ移動
    if (body.softDelete === true) {
      events[idx] = { ...events[idx], deletedAt: now, updatedAt: now };
      saveEvents(events);
      const users = getUsers();
      const depts = getDepartments();
      return NextResponse.json(resolveEvent(events[idx], users, depts));
    }

    // ゴミ箱から復元
    if (body.restore === true) {
      events[idx] = { ...events[idx], deletedAt: null, updatedAt: now };
      saveEvents(events);
      const users = getUsers();
      const depts = getDepartments();
      return NextResponse.json(resolveEvent(events[idx], users, depts));
    }

    // 部署 upsert
    let departmentId: string | null | undefined = undefined;
    if (typeof body.departmentName === "string") {
      if (body.departmentName.trim()) {
        const depts = getDepartments();
        let dept = depts.find((d) => d.name === body.departmentName.trim());
        if (!dept) {
          dept = { id: newId(), name: body.departmentName.trim(), sortOrder: depts.length };
          depts.push(dept);
          saveDepartments(depts);
        }
        departmentId = dept.id;
      } else {
        departmentId = null;
      }
    }

    // フィールド更新
    const updated = { ...events[idx], updatedAt: now };
    if (typeof body.name === "string") updated.name = body.name.trim();
    if (typeof body.employeeId === "string") updated.employeeId = body.employeeId.trim() || null;
    if (typeof body.email === "string") updated.email = body.email.trim() || null;
    if (typeof body.mobilePhone === "string") updated.mobilePhone = body.mobilePhone.trim() || null;
    if (typeof body.teamsPhone === "string") updated.teamsPhone = body.teamsPhone.trim() || null;
    if (typeof body.eventType === "string") updated.eventType = body.eventType;
    if (body.targetDate !== undefined) updated.targetDate = body.targetDate || null;
    if (body.deadline !== undefined) updated.deadline = body.deadline || null;
    if (typeof body.note === "string") updated.note = body.note.trim() || null;
    if (typeof body.isPending === "boolean") updated.isPending = body.isPending;
    if (departmentId !== undefined) updated.departmentId = departmentId;

    events[idx] = updated;
    saveEvents(events);

    const users = getUsers();
    const depts = getDepartments();
    return NextResponse.json(resolveEvent(updated, users, depts));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
