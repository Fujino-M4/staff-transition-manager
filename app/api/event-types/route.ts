import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEventTypes, saveEventTypes, newId, nowIso } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    const types = getEventTypes().sort((a, b) => a.sortOrder - b.sortOrder);
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
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "種別名は必須です" }, { status: 400 });

    const types = getEventTypes();
    if (types.find((t) => t.name === name.trim()))
      return NextResponse.json({ error: "同じ名前の種別が既に存在します" }, { status: 409 });

    const newType = {
      id: newId(),
      name: name.trim(),
      sortOrder: types.length,
      createdAt: nowIso(),
    };
    types.push(newType);
    saveEventTypes(types);
    return NextResponse.json(newType, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
