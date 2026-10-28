import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const parsed = (() => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
})();
if (!parsed || !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) || !parsed.pathname.endsWith("_e2e")) {
  console.error(`Тести очищають базу, тому працюють лише з локальною базою *_e2e. Отримано: ${parsed?.hostname ?? "нічого"}`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });
run("npx prisma db push --skip-generate");
run("npx tsx e2e/clean.ts");
run("npx tsx prisma/seed.ts");
