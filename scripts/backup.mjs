import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не задано");
  process.exit(1);
}
mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const file = `backups/schedule-${stamp}.dump`;
execFileSync("pg_dump", [url, "--no-owner", "--no-privileges", "--format=custom", "-f", file], { stdio: "inherit" });
console.log(`${file} (${(statSync(file).size / 1024).toFixed(0)} КБ)`);
