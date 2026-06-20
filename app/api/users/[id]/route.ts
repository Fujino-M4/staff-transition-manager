import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsers, saveUsers } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    if (id === session.userId)
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });

    const users = getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    users.splice(idx, 1);
    saveUsers(users);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
