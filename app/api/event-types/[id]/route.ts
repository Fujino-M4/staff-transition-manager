import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

    const { id } = await params;
    const type = await prisma.eventTypeDefinition.findUnique({ where: { id } });
    if (!type) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const usedCount = await prisma.hrEvent.count({ where: { eventType: type.name } });
    if (usedCount > 0)
      return NextResponse.json(
        { error: `この種別はすでに ${usedCount} 件のイベントで使用中のため削除できません` },
        { status: 409 }
      );

    await prisma.eventTypeDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
