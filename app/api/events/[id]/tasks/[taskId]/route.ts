import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

  const { taskId } = await params;
  const body = await req.json();

  // チェック切り替え
  if ("isDone" in body) {
    const isDone: boolean = body.isDone;
    const task = await prisma.eventTask.update({
      where: { id: taskId },
      data: {
        isDone,
        doneById: isDone ? session.userId : null,
        doneAt: isDone ? new Date() : null,
      },
      include: { doneBy: { select: { displayName: true } } },
    });
    return NextResponse.json(task);
  }

  // メモ更新
  if ("memo" in body) {
    const memo: string = body.memo;
    const task = await prisma.eventTask.update({
      where: { id: taskId },
      data: {
        memo: memo || null,
        memoUpdatedById: memo.trim() ? session.userId : null,
        memoUpdatedAt: memo.trim() ? new Date() : null,
      },
      include: { memoUpdatedBy: { select: { displayName: true } } },
    });
    return NextResponse.json(task);
  }

  return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
}
