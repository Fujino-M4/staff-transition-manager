import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEventTypes, saveEventTypes, getEvents } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    const types = getEventTypes();
    const target = types.find((t) => t.id === id);
    if (!target) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const events = getEvents();
    const inUse = events.some((e) => e.deletedAt === null && e.eventType === target.name);
    if (inUse)
      return NextResponse.json({ error: "この種別は使用中のため削除できません" }, { status: 409 });

    saveEventTypes(types.filter((t) => t.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
