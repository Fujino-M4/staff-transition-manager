import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, isAdmin: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { username, password, displayName, isAdmin } = await req.json();
  if (!username || !password || !displayName)
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "そのIDはすでに使われています" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, displayName, isAdmin: isAdmin ?? false },
    select: { id: true, username: true, displayName: true, isAdmin: true },
  });
  return NextResponse.json(user, { status: 201 });
}
