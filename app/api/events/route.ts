import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const events = await prisma.hrEvent.findMany({
      where: { deletedAt: null },
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
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });

    const { name, employeeId, email, mobilePhone, teamsPhone, eventType, targetDate, deadline, departmentName, note, isPending } =
      await req.json();

    if (!name?.trim() || !eventType?.trim())
      return NextResponse.json({ error: "氏名とイベント種別は必須です" }, { status: 400 });

    let departmentId: string | undefined;
    if (departmentName?.trim()) {
      const dept = await prisma.department.upsert({
        where: { name: departmentName.trim() },
        update: {},
        create: { name: departmentName.trim() },
      });
      departmentId = dept.id;
    }

    const taskDefs = await prisma.taskDefinition.findMany({
      where: { eventType, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const event = await prisma.hrEvent.create({
      data: {
        name: name.trim(),
        employeeId: employeeId?.trim() || null,
        email: email?.trim() || null,
        mobilePhone: mobilePhone?.trim() || null,
        teamsPhone: teamsPhone?.trim() || null,
        eventType,
        targetDate: targetDate ? new Date(targetDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        isPending: isPending ?? false,
        note: note?.trim() || null,
        departmentId: departmentId || null,
        createdById: session.userId,
        tasks: {
          create: taskDefs.map(
            (def: { id: string; category: string; label: string; sortOrder: number }) => ({
              taskDefId: def.id,
              category: def.category,
              label: def.label,
              sortOrder: def.sortOrder,
            })
          ),
        },
      },
      include: {
        department: true,
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
