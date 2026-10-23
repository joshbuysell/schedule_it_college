"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import { changeSummary, type ChangeDTO } from "@/lib/changes";
import { DAYS_SHORT, addDays, formatDate, matchesWeek, weekParity, weekdayOf, type BellDTO, type LessonDTO } from "@/lib/schedule";

type Props = {
  teacher: { id: number; name: string; short: string };
  lessons: LessonDTO[];
  changes: ChangeDTO[];
  own: ChangeDTO[];
  bells: BellDTO[];
  anchor: string;
  today: string;
  weekStart: string;
  rooms: string[];
};

type Action = { lessonId: number; kind: "cancel" | "room" | "substitute" };

const STATUS = { pending: "очікує розгляду", approved: "підтверджено", rejected: "відхилено" } as const;

export default function Cabinet({ teacher, lessons, changes, own, bells, anchor, today, weekStart, rooms }: Props) {
  const router = useRouter();
  const days = useMemo(() => Array.from({ length: 12 }, (_, i) => addDays(weekStart, i)).filter((d) => weekdayOf(d) <= 5), [weekStart]);
  const [date, setDate] = useState(days.find((d) => d >= today) ?? days[0]);
  const [action, setAction] = useState<Action | null>(null);
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const day = weekdayOf(date);
  const parity = weekParity(anchor, date, day);
  const pairs = lessons.filter((l) => l.day === day && matchesWeek(l.week, parity)).sort((a, b) => a.pair - b.pair);
  const dayChanges = changes.filter((c) => c.date === date);
  const added = dayChanges.filter((c) => !c.cancelled && c.teacherId === teacher.id && !c.replaces.some((r) => r.teacherId === teacher.id));
  const requests = own.filter((c) => c.date === date);
  const changeFor = (l: LessonDTO) => dayChanges.find((c) => c.replaces.some((r) => r.id === l.id));
  const requestFor = (l: LessonDTO) => requests.find((c) => c.groupId === l.groupId && c.pair === l.pair && c.status === "pending");

  async function post(url: string, body: unknown, success: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ text: data.error ?? "Не вдалося надіслати", ok: false });
    setMessage({ text: success, ok: true });
    setAction(null);
    setNote("");
    setRoom("");
    router.refresh();
  }

  function submit(l: LessonDTO) {
    if (!action) return;
    post(
      "/api/cabinet/changes",
      { date, groupId: l.groupId, pair: l.pair, subgroup: l.subgroup, kind: action.kind, room: action.kind === "room" ? room : null, note: note || null },
      "Заявку надіслано до навчальної частини.",
    );
  }

  async function withdraw(id: number) {
    const res = await fetch(`/api/cabinet/changes/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-ink-3">Вітаємо,</p>
          <h1 className="text-2xl font-semibold">{teacher.name}</h1>
        </div>
        <Link href={`/teacher/${teacher.id}`} className="text-sm text-brand hover:underline">
          Мій розклад на тиждень →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDate(d);
              setAction(null);
              setMessage(null);
            }}
            aria-pressed={d === date}
            className={clsx(
              "rounded-md border px-1 py-2 text-center",
              d === date ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
              d < today && d !== date && "opacity-50",
            )}
          >
            <span className="block text-sm font-semibold">{DAYS_SHORT[weekdayOf(d) - 1]}</span>
            <span className="block text-xs opacity-80">{formatDate(d, { day: "numeric", month: "numeric" })}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
          <span className="ml-2 text-sm font-normal text-ink-3">{parity === "num" ? "чисельник" : "знаменник"}</span>
        </h2>
        {pairs.length > 0 && date >= today && (
          <button
            disabled={busy}
            onClick={() => {
              const n = prompt("Мене не буде цього дня. Причина (необовʼязково):");
              if (n !== null) post("/api/cabinet/absence", { date, note: n || null }, "Навчальну частину повідомлено, вони призначать заміни.");
            }}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-danger hover:text-danger"
          >
            Мене не буде цього дня
          </button>
        )}
      </div>

      {message && (
        <p className={clsx("mt-3 rounded-md px-3 py-2 text-sm", message.ok ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger")}>{message.text}</p>
      )}

      <div className="mt-3 space-y-2">
        {pairs.length === 0 && added.length === 0 && <p className="rounded-md border border-line bg-surface px-4 py-6 text-ink-2">Цього дня пар немає.</p>}

        {pairs.map((l) => {
          const bell = bells.find((b) => b.pair === l.pair);
          const ch = changeFor(l);
          const req = requestFor(l);
          const open = action?.lessonId === l.id;
          return (
            <div key={l.id} className="rounded-md border border-line bg-surface p-3">
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 tabular-nums">
                  <b>{l.pair} пара</b>
                  <span className="block text-xs text-ink-3">
                    {bell?.start}–{bell?.end}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.group}
                    {l.subgroup > 0 && <span className="font-normal text-ink-3"> · {l.subgroup} підгрупа</span>}
                  </p>
                  <p className="text-sm text-ink-2">
                    {l.subject}
                    {l.room && `, ауд. ${l.room}`}
                  </p>
                  {ch && <p className="mt-1 text-sm text-accent">Зміна: {changeSummary(ch)}</p>}
                  {req && (
                    <p className="mt-1 text-sm text-ink-3">
                      Заявка {STATUS.pending}: {req.cancelled ? req.note ?? "скасування" : `аудиторія ${req.room}`}
                      <button onClick={() => withdraw(req.id)} className="ml-2 text-brand hover:underline">
                        відкликати
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {!ch && !req && date >= today && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {(
                    [
                      ["room", "Інша аудиторія"],
                      ["substitute", "Потрібна заміна"],
                      ["cancel", "Скасувати пару"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      onClick={() => setAction(open && action?.kind === kind ? null : { lessonId: l.id, kind })}
                      className={clsx(
                        "rounded-md border px-3 py-1.5 text-sm",
                        open && action?.kind === kind ? "border-brand bg-brand text-white" : "border-line hover:border-brand hover:text-brand",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {open && (
                <div className="mt-3 space-y-2">
                  {action.kind === "room" && (
                    <>
                      <input
                        list="rooms"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        placeholder="Нова аудиторія, напр. 413"
                        className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-brand"
                      />
                      <datalist id="rooms">
                        {rooms.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </>
                  )}
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={action.kind === "cancel" ? "Причина або коли відпрацюєте" : "Коментар (необовʼязково)"}
                    className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-brand"
                  />
                  <button
                    disabled={busy || (action.kind === "room" && !room)}
                    onClick={() => submit(l)}
                    className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    {busy && <LoaderCircle className="size-4 animate-spin" />} Надіслати
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {added.map((c) => (
          <div key={c.id} className="rounded-md border border-accent/50 bg-accent-soft/40 p-3">
            <p className="font-medium">
              {c.pair} пара · {c.group} <span className="text-sm font-normal text-accent">заміна</span>
            </p>
            <p className="text-sm text-ink-2">
              {c.subject}
              {c.room && `, ауд. ${c.room}`}
            </p>
            {c.note && <p className="text-sm text-ink-3">{c.note}</p>}
          </div>
        ))}
      </div>

      {own.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold">Мої заявки</h2>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {own.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="w-32 shrink-0 text-ink-3">{formatDate(c.date, { day: "numeric", month: "long" })}</span>
                <span className="min-w-0 flex-1">
                  {c.group}, {c.pair} пара — {c.cancelled ? c.note ?? "скасування" : `аудиторія ${c.room}`}
                </span>
                <span className={clsx("rounded px-1.5 py-0.5 text-xs", c.status === "approved" ? "bg-brand-soft text-brand" : c.status === "rejected" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent")}>
                  {STATUS[c.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
