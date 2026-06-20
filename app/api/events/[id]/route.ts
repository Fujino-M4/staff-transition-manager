import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ゴミ箱から完全削除（deletedAt がセットされているもののみ）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.hrEvent.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    if (!event.deletedAt)
      return NextResponse.json({ error: "ゴミ箱に入っていないイベントは完全削除できません" }, { status: 400 });

    await prisma.hrEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // ゴミ箱への移動
    if (body.softDelete === true) {
      const event = await prisma.hrEvent.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json(event);
    }

    // ゴミ箱から復元
    if (body.restore === true) {
      const event = await prisma.hrEvent.update({
        where: { id },
        data: { deletedAt: null },
      });
      return NextResponse.json(event);
    }

    // 部署をupsert（名前が渡された場合）
    let departmentId: string | null | undefined = undefined;
    if (typeof body.departmentName === "string") {
      if (body.departmentName.trim()) {
        const dept = await prisma.department.upsert({
          where: { name: body.departmentName.trim() },
          update: {},
          create: { name: body.departmentName.trim() },
        });
        departmentId = dept.id;
      } else {
        departmentId = null;
      }
    }

    const event = await prisma.hrEvent.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && { name: body.name.trim() }),
        ...(typeof body.employeeId === "string" && {
          employeeId: body.employeeId.trim() || null,
        }),
        ...(typeof body.email === "string" && {
          email: body.email.trim() || null,
        }),
        ...(typeof body.mobilePhone === "string" && {
          mobilePhone: body.mobilePhone.trim() || null,
        }),
        ...(typeof body.teamsPhone === "string" && {
          teamsPhone: body.teamsPhone.trim() || null,
        }),
        ...(typeof body.eventType === "string" && { eventType: body.eventType }),
        ...(body.targetDate !== undefined && {
          targetDate: body.targetDate ? new Date(body.targetDate) : null,
        }),
        ...(body.deadline !== undefined && {
          deadline: body.deadline ? new Date(body.deadline) : null,
        }),
        ...(typeof body.note === "string" && { note: body.note.trim() || null }),
        ...(typeof body.isPending === "boolean" && { isPending: body.isPending }),
        ...(departmentId !== undefined && { departmentId }),
      },
      include: {
        department: true,
        tasks: {
          orderBy: { sortOrder: "asc" },
          include: {
            doneBy: { select: { displayName: true } },
            memoUpdatedBy: { select: { displayName: true } },
          },
        },
      },
    });
    return NextResponse.json(event);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
