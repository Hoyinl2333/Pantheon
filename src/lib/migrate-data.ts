/**
 * Data migration helper — copies old scc-* paths to new ptn-* paths.
 * Safe to call multiple times; only migrates if old exists and new doesn't.
 */
import fs from "fs";
import path from "path";
import os from "os";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");

let migrated = false;

export function ensureDataMigration() {
  if (migrated) return;
  migrated = true;

  // Migrate scc-data/ → ptn-data/
  const oldDataDir = path.join(CLAUDE_DIR, "scc-data");
  const newDataDir = path.join(CLAUDE_DIR, "ptn-data");
  if (fs.existsSync(oldDataDir) && !fs.existsSync(newDataDir)) {
    try {
      fs.cpSync(oldDataDir, newDataDir, { recursive: true });
    } catch { /* ignore */ }
  }

  // Migrate scc-dashboard.db → ptn-dashboard.db
  const oldDb = path.join(CLAUDE_DIR, "scc-dashboard.db");
  const newDb = path.join(CLAUDE_DIR, "ptn-dashboard.db");
  if (fs.existsSync(oldDb) && !fs.existsSync(newDb)) {
    try {
      fs.copyFileSync(oldDb, newDb);
    } catch { /* ignore */ }
  }
}
