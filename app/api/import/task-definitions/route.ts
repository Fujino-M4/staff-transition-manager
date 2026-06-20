import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseCSVToRecords } from "@/lib/csv";
import { getTaskDefinitions, saveTaskDefinitions, newId } from "@/lib/db";

const VALID_CATEGORIES = new Set(["DXS", "AIM", "HR", "GA"]);
const REQUIRED_COLUMNS = ["eventType", "category", "label"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

    const { csv } = await req.json();
    if (typeof csv !== "string" || !csv.trim())
      return NextResponse.json({ error: "CSV データがありません" }, { status: 400 });

    const records = parseCSVToRecords(csv);
    if (records.length === 0)
      return NextResponse.json({ error: "インポートする行がありません" }, { status: 400 });

    const missing = REQUIRED_COLUMNS.filter((col) => !(col in records[0]));
    if (missing.length > 0)
      return NextResponse.json(
        { error: `CSV の列が不足しています: ${missing.join(", ")}` },
        { status: 400 }
      );

    const defs = getTaskDefinitions();
    const sortCounters: Record<string, number> = {};
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      const { eventType, id, category, label } = records[i];

      if (!eventType || !category || !label) {
        errors.push(`${rowNum}行目: eventType・category・label は必須です`);
        continue;
      }
      if (!VALID_CATEGORIES.has(category)) {
        errors.push(`${rowNum}行目: category は DXS / AIM / HR / GA のいずれかです`);
        continue;
      }

      const sortOrder = sortCounters[eventType] ?? 0;
      sortCounters[eventType] = sortOrder + 1;

      if (id) {
        const idx = defs.findIndex((d) => d.id === id);
        if (idx !== -1) {
          defs[idx] = {
            ...defs[idx],
            eventType,
            category,
            label,
            sortOrder,
            isActive: true,
          };
          updated++;
          continue;
        }
      }

      defs.push({
        id: id || newId(),
        eventType,
        category,
        label,
        sortOrder,
        isActive: true,
      });
      created++;
    }

    saveTaskDefinitions(defs);

    return NextResponse.json({ created, updated, errors });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
