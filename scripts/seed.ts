import { readFileSync } from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// .env.local を手動で読み込む
function loadEnvLocal() {
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnvLocal();

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const TASK_TEMPLATES: Record<string, { category: string; label: string }[]> = {
  入社: [
    { category: "DXS", label: "配属チームコード入力" },
    { category: "DXS", label: "配属部署登録" },
    { category: "DXS", label: "syainusers扱い設定" },
    { category: "DXS", label: "携帯電話番号設定" },
    { category: "DXS", label: "外線番号設定" },
    { category: "DXS", label: "PC管理番号の設定" },
    { category: "DXS", label: "iPhone管理番号の設定" },
    { category: "DXS", label: "Boxアカウント作成" },
    { category: "DXS", label: "kintoneアカウント作成" },
    { category: "DXS", label: "movino設定" },
    { category: "HR",  label: "資格／職制設定" },
    { category: "HR",  label: "Shachihata個人印登録" },
    { category: "HR",  label: "Shachihataサイン・角印登録" },
    { category: "HR",  label: "Teams報告" },
  ],
  退社: [
    { category: "DXS", label: "ADサーバー無効化" },
    { category: "DXS", label: "ADからZZZ退職フォルダへ移動" },
    { category: "DXS", label: "Entra無効化確認" },
    { category: "DXS", label: "BOX削除" },
    { category: "DXS", label: "Shachihata削除" },
    { category: "DXS", label: "ISL削除" },
    { category: "DXS", label: "文書情報エントリ（DocuWorks）削除" },
    { category: "DXS", label: "Adobeアカウント削除" },
    { category: "DXS", label: "movino費用見直し" },
    { category: "DXS", label: "Teams電話台帳削除" },
    { category: "DXS", label: "EntraIDデバイス削除" },
    { category: "DXS", label: "メールが有効なセキュリティグループ解除" },
    { category: "DXS", label: "PC回収" },
    { category: "DXS", label: "PC充電器回収" },
    { category: "DXS", label: "PC管理簿に記載" },
    { category: "DXS", label: "iPhone回収" },
    { category: "DXS", label: "iPhone充電器＆ケーブル回収" },
    { category: "DXS", label: "iPhone在庫管理に記載" },
    { category: "HR",  label: "部署マネージャーへ確認メール送付" },
    { category: "HR",  label: "Teams報告" },
    { category: "HR",  label: "セキュリティグループ解除後HR連絡" },
  ],
  社内異動: [
    { category: "DXS", label: "メールが有効なセキュリティ部署変更" },
    { category: "DXS", label: "movino変更" },
    { category: "DXS", label: "Shachihata角印更新" },
    { category: "DXS", label: "BOX引継ぎ期間調整" },
    { category: "HR",  label: "People部署変更" },
    { category: "HR",  label: "異動情報入手・確認" },
    { category: "HR",  label: "Teams報告" },
  ],
  帰任: [
    { category: "DXS", label: "メールが有効なセキュリティ所属変更" },
    { category: "DXS", label: "携帯電話番号設定" },
    { category: "DXS", label: "外線番号設定" },
    { category: "DXS", label: "PC管理番号の更新" },
    { category: "DXS", label: "movino設定" },
    { category: "HR",  label: "People所属変更" },
    { category: "HR",  label: "帰任先部署名登録" },
    { category: "HR",  label: "Teams報告" },
  ],
};

const INITIAL_EVENT_TYPES = ["入社", "退社", "社内異動", "帰任"];

async function main() {
  console.log("🌱 シード開始...");

  // イベント種別の初期データ
  for (let i = 0; i < INITIAL_EVENT_TYPES.length; i++) {
    await prisma.eventTypeDefinition.upsert({
      where: { name: INITIAL_EVENT_TYPES[i] },
      update: {},
      create: { name: INITIAL_EVENT_TYPES[i], sortOrder: i },
    });
  }
  console.log(`✅ イベント種別作成: ${INITIAL_EVENT_TYPES.join(", ")}`);

  // 管理者ユーザー作成
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash, displayName: "管理者", isAdmin: true },
  });
  console.log(`✅ ユーザー作成: ${admin.username}`);

  // タスクテンプレート作成（既存はスキップ）
  let taskCount = 0;
  for (const [eventType, tasks] of Object.entries(TASK_TEMPLATES)) {
    for (let i = 0; i < tasks.length; i++) {
      const { category, label } = tasks[i];
      const exists = await prisma.taskDefinition.findFirst({
        where: { eventType, label, isActive: true },
      });
      if (!exists) {
        await prisma.taskDefinition.create({
          data: { eventType, category, label, sortOrder: i },
        });
        taskCount++;
      }
    }
  }
  console.log(`✅ タスクテンプレート作成: ${taskCount}件`);

  console.log("🎉 シード完了！");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
