import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

    const { id } = await params;
    await prisma.taskDefinition.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

    const { id } = await params;
    const { direction } = await req.json();

    const current = await prisma.taskDefinition.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const siblings = await prisma.taskDefinition.findMany({
      where: { eventType: current.eventType, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const idx = siblings.findIndex((t) => t.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length)
      return NextResponse.json({ error: "移動できません" }, { status: 400 });

    const swapTarget = siblings[swapIdx];
    await prisma.$transaction([
      prisma.taskDefinition.update({ where: { id }, data: { sortOrder: swapTarget.sortOrder } }),
      prisma.taskDefinition.update({ where: { id: swapTarget.id }, data: { sortOrder: current.sortOrder } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
