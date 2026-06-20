import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDepartments, saveDepartments, newId } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    return NextResponse.json(getDepartments());
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
      return NextResponse.json({ error: "部署名は必須です" }, { status: 400 });

    const depts = getDepartments();
    const existing = depts.find((d) => d.name === name.trim());
    if (existing) return NextResponse.json(existing);

    const newDept = { id: newId(), name: name.trim(), sortOrder: depts.length };
    depts.push(newDept);
    saveDepartments(depts);
    return NextResponse.json(newDept, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
