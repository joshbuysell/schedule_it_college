"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/schedule";

type Semester = { id: number; title: string; numeratorAnchor: string; endDate: string; active: boolean; lessons: number };

export default function Semesters({ semesters }: { semesters: Semester[] }) {
  const router = useRouter();
  const active = semesters.find((s) => s.active);
  const [form, setForm] = useState({ title: "", numeratorAnchor: "", endDate: "", copyFrom: active ? String(active.id) : "" });
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Помилка");
      return null;
    }
    router.refresh();
    return data;
  }

  const input = "mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 outline-none focus:border-brand";

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8">
      <h1 className="text-3xl font-semibold">Налаштування</h1>
      <section className="mt-6 rounded-md border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Семестри</h2>
        <p className="mt-1 text-sm text-ink-2">
          Новий семестр можна підготувати заздалегідь як чернетку, поки студенти бачать поточний, і опублікувати одним натиском.
        </p>
        {error && <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {semesters.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {s.title}{" "}
                  {s.active ? (
                    <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-medium text-white">опубліковано</span>
                  ) : (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-3">чернетка</span>
                  )}
                </p>
                <p className="text-sm text-ink-3">
                  з {formatDate(s.numeratorAnchor)} до {formatDate(s.endDate, { day: "numeric", month: "long", year: "numeric" })} · {s.lessons} занять
                </p>
              </div>
              <Link href={`/admin/editor${s.active ? "" : `?semester=${s.id}`}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-brand hover:text-brand">
                Редагувати
              </Link>
              {!s.active && (
                <>
                  <button
                    onClick={() => confirm(`Опублікувати «${s.title}»? Студенти одразу побачать цей розклад.`) && call(`/api/admin/semesters/${s.id}`, "PATCH", { activate: true })}
                    className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-deep"
                  >
                    Опублікувати
                  </button>
                  <button
                    onClick={() => confirm(`Видалити «${s.title}» разом з усіма заняттями?`) && call(`/api/admin/semesters/${s.id}`, "DELETE")}
                    className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-danger hover:text-danger"
                  >
                    Видалити
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await call("/api/admin/semesters", "POST", { ...form, copyFrom: form.copyFrom ? Number(form.copyFrom) : null });
            if (ok) setForm({ ...form, title: "", numeratorAnchor: "", endDate: "" });
          }}
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          <p className="font-medium sm:col-span-2">Новий семестр</p>
          <label className="text-sm text-ink-2 sm:col-span-2">
            Назва
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="І семестр 2026/2027 н.р." className={input} />
          </label>
          <label className="text-sm text-ink-2">
            Понеділок першого тижня-чисельника
            <input required type="date" value={form.numeratorAnchor} onChange={(e) => setForm({ ...form, numeratorAnchor: e.target.value })} className={input} />
          </label>
          <label className="text-sm text-ink-2">
            Кінець семестру
            <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={input} />
          </label>
          <label className="text-sm text-ink-2 sm:col-span-2">
            Почати з
            <select value={form.copyFrom} onChange={(e) => setForm({ ...form, copyFrom: e.target.value })} className={input}>
              <option value="">порожнього розкладу</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  копії: {s.title}
                </option>
              ))}
            </select>
          </label>
          <button className="h-9 rounded-md bg-brand px-4 font-medium text-white hover:bg-brand-deep sm:w-fit">Створити чернетку</button>
        </form>
      </section>
    </main>
  );
}
