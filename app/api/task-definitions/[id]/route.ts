import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTaskDefinitions, saveTaskDefinitions } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    const defs = getTaskDefinitions();
    const idx = defs.findIndex((d) => d.id === id);
    if (idx === -1) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    defs[idx] = { ...defs[idx], isActive: false };
    saveTaskDefinitions(defs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const defs = getTaskDefinitions();
    const idx = defs.findIndex((d) => d.id === id);
    if (idx === -1) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    // 並び替え（up/down）
    if (body.direction === "up" || body.direction === "down") {
      const eventType = defs[idx].eventType;
      const group = defs
        .filter((d) => d.eventType === eventType && d.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const pos = group.findIndex((d) => d.id === id);
      const swapPos = body.direction === "up" ? pos - 1 : pos + 1;
      if (swapPos < 0 || swapPos >= group.length)
        return NextResponse.json({ error: "移動できません" }, { status: 400 });

      const tmp = group[pos].sortOrder;
      const idxSwap = defs.findIndex((d) => d.id === group[swapPos].id);
      defs[idx] = { ...defs[idx], sortOrder: group[swapPos].sortOrder };
      defs[idxSwap] = { ...defs[idxSwap], sortOrder: tmp };
      saveTaskDefinitions(defs);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "不明な操作" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
