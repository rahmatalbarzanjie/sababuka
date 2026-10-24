import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const migrationDirectory = path.resolve(process.cwd(), "database", "migrations");

// Migration 029 originally tried to create an optional demo batch even when its
// developer actor was absent on a clean installation. The corrected SQL skips
// that demo row. Accept only the audited original checksum so existing databases
// can record the correction without weakening checksum validation generally.
const approvedChecksumReplacements: Record<string, ReadonlySet<string>> = {
  "029": new Set(["93c1b3aebf847b841d51532ee04c293cfea620750db5c8c4a3eba4c7cb889351"]),
};

try {
  const files = (await readdir(migrationDirectory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  for (const filename of files) {
    const version = filename.slice(0, 3);
    const sql = await readFile(path.join(migrationDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(sql, "utf8").digest("hex");
    const ledger = await db.query<{ ledger_exists: boolean }>(
      "SELECT to_regclass('sababuka.schema_migrations') IS NOT NULL AS ledger_exists",
    );

    if (ledger.rows[0]?.ledger_exists) {
      const applied = await db.query<{ checksum: string | null }>(
        "SELECT checksum FROM sababuka.schema_migrations WHERE version = $1",
        [version],
      );
      const record = applied.rows[0];
      if (record) {
        if (record.checksum && record.checksum !== checksum) {
          if (approvedChecksumReplacements[version]?.has(record.checksum)) {
            await db.query(
              "UPDATE sababuka.schema_migrations SET checksum = $2 WHERE version = $1",
              [version, checksum],
            );
            console.warn(`Perbarui checksum ${filename} untuk koreksi kompatibilitas yang disetujui.`);
          } else {
            throw new Error(`Checksum migration ${filename} berubah setelah diterapkan.`);
          }
        }
        if (!record.checksum) {
          await db.query(
            "UPDATE sababuka.schema_migrations SET checksum = $2 WHERE version = $1",
            [version, checksum],
          );
        }
        console.log(`Lewati ${filename} (sudah diterapkan).`);
        continue;
      }
    }

    console.log(`Terapkan ${filename}...`);
    await db.query(sql);
    await db.query(
      "UPDATE sababuka.schema_migrations SET checksum = $2 WHERE version = $1",
      [version, checksum],
    );
  }

  console.log("Seluruh migration selesai.");
} finally {
  await db.end();
}
