import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    const defs = await prisma.taskDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ eventType: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json(defs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

    const { eventType, category, label } = await req.json();
    if (!eventType || !category || !label)
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });

    const maxOrder = await prisma.taskDefinition.aggregate({
      where: { eventType, isActive: true },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const def = await prisma.taskDefinition.create({
      data: { eventType, category, label, sortOrder: nextOrder },
    });
    return NextResponse.json(def, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
