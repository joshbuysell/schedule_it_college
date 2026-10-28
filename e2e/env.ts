// Тестові значення для локальної бази schedule_e2e, яка щоразу створюється з нуля.
export const PORT = 3210;
export const BASE_URL = `http://localhost:${PORT}`;

// Середа, 2-га пара (10:00–11:20) за київським часом.
export const NOW = "2026-10-28T10:30:00+02:00";
export const TODAY = "2026-10-28";
export const TOMORROW = "2026-10-29";

export const ADMIN = { email: "e2e-admin@test.local", password: "e2e-local-only" };

export const GROUP = "КІ-21";
export const TEACHER = "Прищляк А.А.";

export function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL || "postgresql://localhost:5432/schedule");
  url.pathname = "/schedule_e2e";
  return url.toString();
}
