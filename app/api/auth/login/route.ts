import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { getUsers } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "ユーザー名とパスワードを入力してください" }, { status: 400 });

    const users = getUsers();
    const user = users.find((u) => u.username === username);
    if (!user)
      return NextResponse.json({ error: "ユーザー名またはパスワードが違います" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return NextResponse.json({ error: "ユーザー名またはパスワードが違います" }, { status: 401 });

    await createSession({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
