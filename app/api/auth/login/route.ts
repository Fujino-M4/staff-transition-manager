import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password)
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return NextResponse.json({ error: "IDまたはパスワードが正しくありません" }, { status: 401 });

  await createSession({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
  });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
  });
}
