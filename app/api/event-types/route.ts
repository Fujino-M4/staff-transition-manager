import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    const types = await prisma.eventTypeDefinition.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json(types);
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

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "種別名は必須です" }, { status: 400 });

    const exists = await prisma.eventTypeDefinition.findUnique({ where: { name: name.trim() } });
    if (exists) return NextResponse.json({ error: "その種別はすでに存在します" }, { status: 409 });

    const maxOrder = await prisma.eventTypeDefinition.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const type = await prisma.eventTypeDefinition.create({
      data: { name: name.trim(), sortOrder: nextOrder },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
