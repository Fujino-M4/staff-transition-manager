import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    // 管理者は全件、一般ユーザーは自分が作成したもののみ
    const events = await prisma.hrEvent.findMany({
      where: {
        deletedAt: { not: null },
        ...(!session.isAdmin && { createdById: session.userId }),
      },
      include: { department: true, tasks: { orderBy: { sortOrder: "asc" } } },
      orderBy: { deletedAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
