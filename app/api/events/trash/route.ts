import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEvents, getDepartments, getUsers, resolveEvent } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const events = getEvents().filter((e) => e.deletedAt !== null);
    const filtered = session.isAdmin
      ? events
      : events.filter((e) => e.createdById === session.userId);

    const users = getUsers();
    const depts = getDepartments();
    const resolved = filtered
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
      .map((e) => resolveEvent(e, users, depts));
    return NextResponse.json(resolved);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
