/**
 * Імпорт розкладу з текстового формату (розшифровка PDF-скану з itcollege.lviv.ua)
 * у базу даних. Формат описано на початку файлу prisma/data/*.txt.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const SPECIALTIES: Record<string, string> = {
  КН: "Комп'ютерні науки",
  КНк: "Комп'ютерні науки",
  КІ: "Комп'ютерна інженерія",
  КІк: "Комп'ютерна інженерія",
  ТК: "Телекомунікації та комп'ютерні технології",
  ІП: "Інжиніринг та програмування в інфокомунікаціях",
  МТ: "Мережеві технології та Інтернет речей",
};

const BELLS = [
  ["08:30", "09:50"],
  ["10:00", "11:20"],
  ["12:00", "13:20"],
  ["13:30", "14:50"],
  ["15:00", "16:20"],
  ["16:30", "17:50"],
];

// Повні імена та циклові комісії — зі сторінок циклових комісій на itcollege.lviv.ua
const TEACHERS: Record<string, [string, string]> = {
  "Вербовська О.В.": ["Вербовська Оксана Василівна", "Загальноосвітньої гуманітарної підготовки"],
  "Вонсовський А.Б.": ["Вонсовський Андрій Броніславович", "Загальноосвітньої гуманітарної підготовки"],
  "Гавдьо О.Б.": ["Гавдьо Оксана Богданівна", "Загальноосвітньої гуманітарної підготовки"],
  "Залога О.В.": ["Залога Ольга Володимирівна", "Загальноосвітньої гуманітарної підготовки"],
  "Кречковський З.Д.": ["Кречковський Зіновій Дмитрович", "Загальноосвітньої гуманітарної підготовки"],
  "Мировський О.А.": ["Мировський Олексій Анатолійович", "Загальноосвітньої гуманітарної підготовки"],
  "Нагірна О.В.": ["Нагірна Олена Володимирівна", "Загальноосвітньої гуманітарної підготовки"],
  "Фігурний Д.В.": ["Фігурний Дмитро Васильович", "Загальноосвітньої гуманітарної підготовки"],
  "Щерба І.Г.": ["Щерба Ірина Григорівна", "Загальноосвітньої гуманітарної підготовки"],
  "Цебенко О.З.": ["Цебенко Оксана Зіновіївна", "Іноземних мов"],
  "Лин О.В.": ["Лин Оксана Володимирівна", "Іноземних мов"],
  "Ляшенко В.Е.": ["Ляшенко Вікторія Емануїлівна", "Іноземних мов"],
  "Матвіїшин Ю.М.": ["Матвіїшин Юлія Миронівна", "Іноземних мов"],
  "Хмеляр Т.М.": ["Хмеляр Тетяна Михайлівна", "Іноземних мов"],
  "Жукова Н.В.": ["Жукова Наталія Володимирівна", "Гуманітарної та соціально-економічної підготовки"],
  "Смук М.Б.": ["Смук Мар'яна Богданівна", "Гуманітарної та соціально-економічної підготовки"],
  "Петрик Г.П.": ["Петрик Галина Павлівна", "Гуманітарної та соціально-економічної підготовки"],
  "Жукова Т.В.": ["Жукова Тетяна Володимирівна", "Гуманітарної та соціально-економічної підготовки"],
  "Станевич В.С.": ["Станевич Володимир Станіславович", "Гуманітарної та соціально-економічної підготовки"],
  "Шиц М.І.": ["Шиц Микола Ігорович", "Гуманітарної та соціально-економічної підготовки"],
  "Підкуймуха Т.І.": ["Підкуймуха Тетяна Ігорівна", "Гуманітарної та соціально-економічної підготовки"],
  "Васильков Б.І.": ["Васильков Борис Іванович", "Гуманітарної та соціально-економічної підготовки"],
  "Кіндрат М.М.": ["", "Діловодства та інформаційної діяльності"],
  "Шумлянська Н.Б.": ["", "Діловодства та інформаційної діяльності"],
  "Гошко З.О.": ["Гошко Зеновія Олександрівна", "Загальноосвітньої природничо-математичної підготовки"],
  "Желізняк Г.О.": ["Желізняк Галина Олексіївна", "Загальноосвітньої природничо-математичної підготовки"],
  "Йосифів Л.Б.": ["Йосифів Лідія Богданівна", "Загальноосвітньої природничо-математичної підготовки"],
  "Мельничук О.О.": ["Мельничук Оксана Олегівна", "Загальноосвітньої природничо-математичної підготовки"],
  "Романяк М.М.": ["Романяк Марія Михайлівна", "Загальноосвітньої природничо-математичної підготовки"],
  "Терлецька Л.О.": ["Терлецька Любомира Орестівна", "Загальноосвітньої природничо-математичної підготовки"],
  "Кісіль М.М.": ["Кісіль Марія Михайлівна", "Природничо-наукової та математичної підготовки"],
  "Охремчук Н.Л.": ["Охремчук Наталія Леонідівна", "Природничо-наукової та математичної підготовки"],
  "Стрелецька Н.М.": ["Стрелецька Наталія Миколаївна", "Природничо-наукової та математичної підготовки"],
  "Тибель І.М.": ["Тибель Ігор Миколайович", "Природничо-наукової та математичної підготовки"],
  "Шеремета М.Я.": ["Шеремета Мирослава Ярославівна", "Природничо-наукової та математичної підготовки"],
  "Кагало І.О.": ["Кагало Ігор Олександрович", "Комп'ютерних систем і мереж"],
  "Юнак О.М.": ["Юнак Остап Миронович", "Комп'ютерних систем і мереж"],
  "Кащук В.Д.": ["Кащук Валерій Дмитрович", "Комп'ютерних систем і мереж"],
  "Кубик Л.Я.": ["Кубик Лілія Ярославівна", "Комп'ютерних систем і мереж"],
  "Селемонавічус А.А.": ["Селемонавічус Андрій Альвідасович", "Комп'ютерних систем і мереж"],
  "Пліш В.М.": ["", "Телекомунікацій"],
  "Бреус Є.В.": ["", "Телекомунікацій"],
  "Загорянська О.І.": ["", "Телекомунікацій"],
  "Кремпа Л.С.": ["", "Телекомунікацій"],
  "Максимович П.С.": ["", "Телекомунікацій"],
  "Мельникова О.В.": ["", "Телекомунікацій"],
  "Томків Р.В.": ["", "Телекомунікацій"],
  "Чиженьков М.В.": ["", "Телекомунікацій"],
  "Бохонко Б.А.": ["", "Фундаментальної підготовки"],
  "Семянистий К.С.": ["", "Фундаментальної підготовки"],
  "Дещинський Ю.Л.": ["", "Фундаментальної підготовки"],
  "Стахів В.М.": ["Стахів Володимир Михайлович", ""],
  "Крот О.М.": ["Крот Ольга Михайлівна", ""],
  "Данильченко Т.Є.": ["Данильченко Тетяна Євгенівна", ""],
};

const DEGREES: Record<string, string> = {
  "Кужій Л.І.": "к.т.н.",
  "Бохонко Б.А.": "к.т.н.",
  "Бугиль Б.А.": "к.т.н.",
  "Семянистий К.С.": "к.т.н.",
  "Кагало І.О.": "к.т.н.",
  "Дещинський Ю.Л.": "к.п.н.",
  "Жукова Н.В.": "к.ф.н.",
};

type ParsedLesson = {
  day: number;
  pair: number;
  week: "all" | "num" | "den";
  subgroup: number;
  subject: string;
  teacher: string | null;
  room: string | null;
};

type ParsedGroup = {
  name: string;
  lessons: ParsedLesson[];
  practices: { title: string; dates: string; teachers: string }[];
};

export function parseSchedule(text: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  let current: ParsedGroup | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("=")) {
      current = { name: line.slice(1).trim(), lessons: [], practices: [] };
      groups.push(current);
      continue;
    }
    if (!current) throw new Error(`Рядок поза групою: ${line}`);

    if (line.startsWith("practice:")) {
      const [title, dates, teachers] = line.slice(9).split("|").map((s) => s.trim());
      current.practices.push({ title, dates, teachers: teachers.replace(/\s*\/\s*/g, ", ") });
      continue;
    }

    const m = line.match(/^(\d)\.(\d)\s+(?:(ч|з):\s*)?(.*)$/);
    if (!m) throw new Error(`Не вдалося розібрати: ${line}`);
    const [, d, p, w, rest] = m;
    const parts = rest.split("|").map((s) => s.trim());
    const [subject, teacherPart = "", roomPart = "", flag = ""] = parts;
    const week = w === "ч" ? "num" : w === "з" ? "den" : "all";
    const teachers = teacherPart.split("/").map((s) => s.trim()).filter(Boolean);
    const rooms = roomPart.split("/").map((s) => s.trim()).filter(Boolean);

    if (teachers.length > 1) {
      // розділення на підгрупи
      teachers.forEach((t, i) =>
        current!.lessons.push({
          day: +d, pair: +p, week, subgroup: i + 1, subject,
          teacher: t, room: rooms[i] ?? rooms[0] ?? null,
        }),
      );
    } else {
      current.lessons.push({
        day: +d, pair: +p, week,
        subgroup: flag === "sg1" ? 1 : flag === "sg2" ? 2 : 0,
        subject, teacher: teachers[0] ?? null, room: rooms[0] ?? null,
      });
    }
  }
  return groups;
}

function groupMeta(name: string) {
  const m = name.match(/^(\p{L}+)-(\d)/u);
  if (!m) throw new Error(`Невідомий формат групи ${name}`);
  return { course: +m[2], specialty: SPECIALTIES[m[1]] ?? m[1] };
}

/** Обліковий запис навчальної частини з ADMIN_EMAIL / ADMIN_PASSWORD (оновлює пароль при кожному запуску). */
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@itcollege.lviv.ua").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return console.warn("ADMIN_PASSWORD не задано — обліковий запис адміністратора не створено");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Навчальна частина", role: "admin", passwordHash },
  });
}

async function importSchedule() {
  const text = readFileSync(join(__dirname, "data", "schedule-2025-2026-sem2.txt"), "utf8");
  const parsed = parseSchedule(text);

  await prisma.lesson.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.group.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();

  // Довідники — пакетно (швидко навіть для віддаленої бази)
  const all = parsed.flatMap((g) => g.lessons);
  const teacherNames = [...new Set(all.map((l) => l.teacher).filter((t): t is string => !!t))];
  const subjectNames = [...new Set(all.map((l) => l.subject))];
  const roomNames = [...new Set(all.map((l) => l.room).filter((r): r is string => !!r))];

  await prisma.teacher.createMany({
    data: teacherNames.map((short) => {
      const [fullName, commission] = TEACHERS[short] ?? ["", ""];
      return { shortName: short, fullName: fullName || null, commission: commission || null, degree: DEGREES[short] ?? null };
    }),
  });
  await prisma.subject.createMany({ data: subjectNames.map((name) => ({ name })) });
  await prisma.room.createMany({ data: roomNames.map((name) => ({ name, shared: name === "кфв" })) });
  await prisma.group.createMany({ data: parsed.map((g) => ({ name: g.name, ...groupMeta(g.name) })) });

  const ids = async <T extends { id: number }>(rows: T[], key: (r: T) => string) => new Map(rows.map((r) => [key(r), r.id]));
  const teacherIds = await ids(await prisma.teacher.findMany(), (t) => t.shortName);
  const subjectIds = await ids(await prisma.subject.findMany(), (t) => t.name);
  const roomIds = await ids(await prisma.room.findMany(), (t) => t.name);
  const groupIds = await ids(await prisma.group.findMany(), (t) => t.name);

  await prisma.lesson.createMany({
    data: parsed.flatMap((g) =>
      g.lessons.map((l) => ({
        groupId: groupIds.get(g.name)!,
        day: l.day,
        pair: l.pair,
        week: l.week,
        subgroup: l.subgroup,
        subjectId: subjectIds.get(l.subject)!,
        teacherId: l.teacher ? teacherIds.get(l.teacher)! : null,
        roomId: l.room ? roomIds.get(l.room)! : null,
      })),
    ),
  });
  await prisma.practice.createMany({
    data: parsed.flatMap((g) => g.practices.map((p) => ({ groupId: groupIds.get(g.name)!, ...p }))),
  });

  await prisma.bell.createMany({
    data: BELLS.map(([start, end], i) => ({ pair: i + 1, start, end })),
    skipDuplicates: true,
  });

  const settings: Record<string, string> = {
    semesterLabel: "ІІ семестр 2025/2026 н.р.",
    // понеділок тижня, який вважається чисельником; парність рахується від нього
    numeratorAnchor: "2026-09-07",
    semesterEnd: "2026-12-25",
    source: "https://itcollege.lviv.ua/rozklad-2-2025-2026/",
  };
  await prisma.setting.createMany({
    data: Object.entries(settings).map(([key, value]) => ({ key, value })),
    skipDuplicates: true,
  });

  console.log(
    `Імпортовано: ${parsed.length} груп, ${all.length} занять, ${teacherNames.length} викладачів, ` +
      `${subjectNames.length} дисциплін, ${roomNames.length} аудиторій`,
  );
}

/**
 * npm run db:seed               — повний імпорт (стирає поточний розклад!)
 * tsx prisma/seed.ts --if-empty — імпорт лише в порожню базу (використовується під час розгортання)
 */
async function main() {
  const ifEmpty = process.argv.includes("--if-empty");
  if (ifEmpty && (await prisma.group.count()) > 0) {
    console.log("База вже містить розклад — імпорт пропущено");
  } else {
    await importSchedule();
  }
  await ensureAdmin();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
