import "server-only";
import ExcelJS from "exceljs";
import { DAYS, byName, type BellDTO, type LessonDTO, type Week } from "./schedule";
import type { WorkloadRow } from "./workload";

export const COLUMNS = ["Група", "День", "Пара", "Тиждень", "Підгрупа", "Дисципліна", "Викладач", "Аудиторія"] as const;

const WEEK_TEXT: Record<Week, string> = { all: "щотижня", num: "чисельник", den: "знаменник" };
const BRAND = "FF323A8D";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  row.alignment = { vertical: "middle" };
}

function flatSheet(wb: ExcelJS.Workbook, lessons: LessonDTO[]) {
  const ws = wb.addWorksheet("Заняття", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((header, i) => ({ header, width: [10, 12, 6, 12, 10, 40, 22, 11][i] }));
  styleHeader(ws.getRow(1));
  const sorted = [...lessons].sort((a, b) => byName(a.group, b.group) || a.day - b.day || a.pair - b.pair || a.subgroup - b.subgroup);
  for (const l of sorted) {
    ws.addRow([l.group, DAYS[l.day - 1], l.pair, WEEK_TEXT[l.week], l.subgroup || "", l.subject, l.teacher ?? "", l.room ?? ""]);
  }
  ws.autoFilter = { from: "A1", to: "H1" };
  return ws;
}

export async function scheduleWorkbook(lessons: LessonDTO[], groups: { name: string; course: number }[], bells: BellDTO[], title: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Розклад ІТ коледжу";
  flatSheet(wb, lessons);

  for (const course of [1, 2, 3, 4]) {
    const names = groups.filter((g) => g.course === course).map((g) => g.name).sort(byName);
    if (!names.length) continue;
    const ws = wb.addWorksheet(`${course} курс`, { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
    ws.getCell("A1").value = `${title} — ${course} курс`;
    ws.getCell("A1").font = { bold: true, size: 13 };
    ws.getRow(2).values = ["День", "Пара", ...names];
    styleHeader(ws.getRow(2));
    ws.getColumn(1).width = 12;
    ws.getColumn(2).width = 12;
    names.forEach((_, i) => (ws.getColumn(i + 3).width = 30));

    for (let day = 1; day <= 5; day++) {
      for (const b of bells) {
        const cells = names.map((g) =>
          lessons
            .filter((l) => l.group === g && l.day === day && l.pair === b.pair)
            .map((l) =>
              [
                l.week !== "all" ? `[${WEEK_TEXT[l.week]}]` : "",
                l.subgroup ? `(${l.subgroup} пг)` : "",
                l.subject,
                l.teacher && `— ${l.teacher}`,
                l.room && `, ауд. ${l.room}`,
              ]
                .filter(Boolean)
                .join(" "),
            )
            .join("\n"),
        );
        if (b.pair > 4 && cells.every((c) => !c)) continue;
        const row = ws.addRow([DAYS[day - 1], `${b.pair} (${b.start})`, ...cells]);
        row.alignment = { wrapText: true, vertical: "top" };
      }
    }
  }
  return wb.xlsx.writeBuffer();
}

export async function workloadWorkbook(rows: WorkloadRow[], title: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Навантаження", { views: [{ state: "frozen", ySplit: 2 }] });
  ws.getCell("A1").value = `Тижневе навантаження викладачів — ${title}`;
  ws.getCell("A1").font = { bold: true, size: 13 };
  ws.getRow(2).values = ["Викладач", "Пар на тиждень", "Годин на тиждень", "Групи", "Дисципліни"];
  styleHeader(ws.getRow(2));
  ws.columns = [{ width: 24 }, { width: 15 }, { width: 16 }, { width: 40 }, { width: 70 }];
  for (const r of rows) {
    ws.addRow([r.teacher, r.pairs, r.hours, r.groups.join(", "), r.subjects.map((s) => `${s.subject} (${s.pairs})`).join("; ")]).alignment = {
      wrapText: true,
      vertical: "top",
    };
  }
  return wb.xlsx.writeBuffer();
}

export async function templateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = flatSheet(wb, []);
  ws.addRow(["КІ-21", "Понеділок", 1, "щотижня", "", "Вища математика", "Кузар Х.В.", "401"]);
  ws.addRow(["КІ-21", "Понеділок", 2, "чисельник", 1, "Іноземна мова", "Цебенко О.З.", "302"]);
  const help = wb.addWorksheet("Як заповнювати");
  help.columns = [{ width: 18 }, { width: 80 }];
  [
    ["Група", "Назва групи як на сайті, напр. КІ-21. Нові групи треба спершу додати в довідник."],
    ["День", "Понеділок … Пʼятниця або число 1–5."],
    ["Пара", "Номер пари 1–6."],
    ["Тиждень", "щотижня, чисельник або знаменник (можна порожньо = щотижня)."],
    ["Підгрупа", "Порожньо — уся група, або 1 / 2."],
    ["Дисципліна", "Назва. Нові дисципліни, викладачі й аудиторії додадуться автоматично."],
    ["Викладач", "Прізвище та ініціали: Кузар Х.В."],
    ["Аудиторія", "Номер: 401, 209л, кфв."],
  ].forEach((r) => help.addRow(r));
  help.getRow(1).font = { bold: true };
  return wb.xlsx.writeBuffer();
}

export type ImportRow = {
  row: number;
  group: string;
  day: number;
  pair: number;
  week: Week;
  subgroup: number;
  subject: string;
  teacher: string | null;
  room: string | null;
};

const norm = (v: unknown) =>
  String(v && typeof v === "object" && "text" in v ? (v as { text: string }).text : (v ?? ""))
    .replace(/\s+/g, " ")
    .trim();

export async function parseImport(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet("Заняття") ?? wb.worksheets[0];
  if (!ws) return { rows: [], errors: [{ row: 0, message: "У файлі немає аркушів" }] };

  const header = (ws.getRow(1).values as unknown[]).slice(1).map((v) => norm(v).toLowerCase());
  const col = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c.toLowerCase()) + 1]));
  const missing = COLUMNS.filter((c) => !col[c] && c !== "Підгрупа" && c !== "Тиждень");
  if (missing.length) return { rows: [], errors: [{ row: 1, message: `Немає стовпців: ${missing.join(", ")}` }] };

  const dayNames = DAYS.map((d) => d.toLowerCase().replace("'", "ʼ"));
  const rows: ImportRow[] = [];
  const errors: { row: number; message: string }[] = [];

  ws.eachRow((r, n) => {
    if (n === 1) return;
    const get = (c: (typeof COLUMNS)[number]) => (col[c] ? norm(r.getCell(col[c]).value) : "");
    const group = get("Група");
    const subject = get("Дисципліна");
    if (!group && !subject) return;

    const dayRaw = get("День").toLowerCase().replace("'", "ʼ");
    const day = /^[1-5]$/.test(dayRaw) ? +dayRaw : dayNames.indexOf(dayRaw) + 1;
    const pair = Number(get("Пара"));
    const weekRaw = get("Тиждень").toLowerCase();
    const week: Week | null = !weekRaw || weekRaw.startsWith("щотиж") ? "all" : weekRaw.startsWith("чис") ? "num" : weekRaw.startsWith("знам") ? "den" : null;
    const sg = get("Підгрупа");
    const subgroup = sg === "" ? 0 : Number(sg);

    const problems = [
      !group && "немає групи",
      !day && `невідомий день «${get("День")}»`,
      !(pair >= 1 && pair <= 6) && `пара має бути 1–6`,
      !week && `тиждень «${weekRaw}»`,
      ![0, 1, 2].includes(subgroup) && "підгрупа має бути 1 або 2",
      !subject && "немає дисципліни",
    ].filter(Boolean);
    if (problems.length) {
      errors.push({ row: n, message: problems.join("; ") });
      return;
    }
    rows.push({ row: n, group, day, pair, week: week!, subgroup, subject, teacher: get("Викладач") || null, room: get("Аудиторія") || null });
  });
  return { rows, errors };
}
