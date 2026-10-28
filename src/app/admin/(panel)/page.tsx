import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, DoorOpen, UserRound, UsersRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings, lessonsWhere } from "@/lib/queries";
import { findConflicts } from "@/lib/conflicts";
import { DAYS } from "@/lib/schedule";

export const metadata: Metadata = { title: "Огляд" };
export const dynamic = "force-dynamic";

const KIND = {
  teacher: { label: "Викладач у двох місцях", icon: UserRound },
  room: { label: "Аудиторія зайнята двічі", icon: DoorOpen },
  group: { label: "Група має дві пари одночасно", icon: UsersRound },
};

export default async function Dashboard() {
  const [lessons, rooms, groups, settings] = await Promise.all([
    lessonsWhere({}),
    prisma.room.findMany({ where: { shared: true }, select: { id: true } }),
    prisma.group.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { lessons: true } } } }),
    getSettings(),
  ]);
  const conflicts = findConflicts(lessons, new Set(rooms.map((r) => r.id)));
  const teachers = new Set(lessons.map((l) => l.teacherId)).size;
  const empty = groups.filter((g) => g._count.lessons === 0);

  const stat = (label: string, value: number | string, tone = "") => (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-ink-3">{label}</p>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-brand">{settings.semesterLabel}</p>
          <h1 className="text-3xl font-bold">Огляд розкладу</h1>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link href="/admin/print" className="inline-flex items-center rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:border-brand hover:text-brand">
          Друк розкладу
        </Link>
        <a href="/poster?all" target="_blank" className="inline-flex items-center rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:border-brand hover:text-brand">
          QR-плакати для груп
        </a>
        <a href="/board" target="_blank" className="inline-flex items-center rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:border-brand hover:text-brand">
          Табло для холу
        </a>
        <Link href="/admin/editor" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-ink hover:opacity-90">
          Відкрити редактор <ArrowRight className="size-4" />
        </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {stat("груп", groups.length)}
        {stat("занять на тиждень", lessons.length)}
        {stat("викладачів задіяно", teachers)}
        {stat("накладок у розкладі", conflicts.length, conflicts.length ? "text-danger" : "text-ok")}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-card lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {conflicts.length ? <AlertTriangle className="size-5 text-danger" /> : <CheckCircle2 className="size-5 text-ok" />}
            Накладки
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Система автоматично перевіряє, щоб викладач, аудиторія чи група не були зайняті двічі в один час (з урахуванням
            чисельника/знаменника та підгруп). Спорткомплекс не перевіряється.
          </p>
          {conflicts.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm font-semibold text-ok">Накладок немає.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {conflicts.map((c, i) => {
                const K = KIND[c.kind];
                return (
                  <li key={i} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-danger-soft text-danger">
                      <K.icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {c.label} <span className="font-normal text-ink-3">· {DAYS[c.day - 1]}, {c.pair} пара</span>
                      </p>
                      <p className="text-xs text-ink-3">{K.label}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.lessons.map((l) => (
                        <Link
                          key={l.id}
                          href={`/admin/editor?group=${encodeURIComponent(l.group)}&slot=${l.day}.${l.pair}`}
                          className="rounded-lg border border-line px-2 py-1 text-xs font-semibold hover:border-brand hover:text-brand"
                          title={`${l.subject} · ${l.teacher ?? ""} · ${l.room ?? ""}`}
                        >
                          {l.group} · {l.room ?? "—"}
                          {l.week !== "all" && ` · ${l.week === "num" ? "чис." : "знам."}`}
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-lg font-bold">Нещодавно змінені</h2>
          <ul className="mt-3 space-y-1">
            {groups.slice(0, 8).map((g) => (
              <li key={g.id}>
                <Link href={`/admin/editor?group=${encodeURIComponent(g.name)}`} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-2">
                  <span className="font-bold">{g.name}</span>
                  <span className="text-xs text-ink-3">
                    {g.updatedAt.toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {empty.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold text-warn">Без розкладу: {empty.length}</h3>
              <p className="mt-1 text-sm text-ink-2">{empty.map((g) => g.name).join(", ")}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
