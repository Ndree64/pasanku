import fs from "node:fs";
import path from "node:path";
import { createSeedDatabase, type LocalDatabase } from "@/lib/data/seed-data";

const DB_PATH = path.join(process.cwd(), ".pasanku-local-db.json");

export function readLocalDb(): LocalDatabase {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (parsed && Array.isArray(parsed.units) && Array.isArray(parsed.profiles)) {
        return parsed;
      }
    }
  } catch {
    // Jika berkas rusak atau belum ada, bangun ulang dari seed
  }
  const seed = createSeedDatabase();
  writeLocalDb(seed);
  return seed;
}

export function writeLocalDb(db: LocalDatabase): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function mutateLocalDb<T>(fn: (db: LocalDatabase) => T): T {
  const db = readLocalDb();
  const result = fn(db);
  writeLocalDb(db);
  return result;
}
