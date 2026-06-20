import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getUsers, saveUsers, newId, nowIso } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const users = getUsers().map(({ passwordHash: _, ...u }) => u);
    return NextResponse.json(users);
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

    const { username, password, displayName, isAdmin } = await req.json();
    if (!username?.trim() || !password?.trim() || !displayName?.trim())
      return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });

    const users = getUsers();
    if (users.find((u) => u.username === username.trim()))
      return NextResponse.json({ error: "そのユーザー名は既に使われています" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: newId(),
      username: username.trim(),
      passwordHash,
      displayName: displayName.trim(),
      isAdmin: !!isAdmin,
      createdAt: nowIso(),
    };
    users.push(newUser);
    saveUsers(users);

    const { passwordHash: _, ...safe } = newUser;
    return NextResponse.json(safe, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
