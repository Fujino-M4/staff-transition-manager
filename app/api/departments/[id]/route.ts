import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDepartments, saveDepartments } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    const depts = getDepartments();
    if (!depts.find((d) => d.id === id))
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    saveDepartments(depts.filter((d) => d.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
