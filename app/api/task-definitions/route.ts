import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTaskDefinitions, saveTaskDefinitions, newId } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    const defs = getTaskDefinitions().filter((d) => d.isActive);
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
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { eventType, category, label } = await req.json();
    if (!eventType?.trim() || !category?.trim() || !label?.trim())
      return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });

    const defs = getTaskDefinitions();
    const maxOrder = defs
      .filter((d) => d.eventType === eventType)
      .reduce((m, d) => Math.max(m, d.sortOrder), -1);

    const newDef = {
      id: newId(),
      eventType: eventType.trim(),
      category: category.trim(),
      label: label.trim(),
      sortOrder: maxOrder + 1,
      isActive: true,
    };
    defs.push(newDef);
    saveTaskDefinitions(defs);
    return NextResponse.json(newDef, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
