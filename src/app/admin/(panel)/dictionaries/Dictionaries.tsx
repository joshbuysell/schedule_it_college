"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { normalizeQuery } from "@/lib/schedule";

type Row = { id: number; _count: { lessons: number }; [k: string]: unknown };
type Kind = "teachers" | "subjects" | "rooms" | "groups";
type Field = { key: string; label: string; type?: "text" | "number" | "bool"; width?: string; required?: boolean };

const CONFIG: Record<Kind, { title: string; fields: Field[] }> = {
  teachers: {
    title: "Викладачі",
    fields: [
      { key: "shortName", label: "Прізвище та ініціали", width: "w-48", required: true },
      { key: "fullName", label: "Повне ім'я", width: "w-72" },
      { key: "degree", label: "Ступінь", width: "w-24" },
      { key: "commission", label: "Циклова комісія", width: "w-80" },
    ],
  },
  subjects: { title: "Дисципліни", fields: [{ key: "name", label: "Назва", width: "w-[32rem]", required: true }] },
  rooms: {
    title: "Аудиторії",
    fields: [
      { key: "name", label: "Номер", width: "w-32", required: true },
      { key: "shared", label: "Спільна (без перевірки накладок)", type: "bool" },
    ],
  },
  groups: {
    title: "Групи",
    fields: [
      { key: "name", label: "Назва", width: "w-32", required: true },
      { key: "course", label: "Курс", type: "number", width: "w-20", required: true },
      { key: "specialty", label: "Спеціальність", width: "w-96", required: true },
    ],
  },
};

export default function Dictionaries({ data }: { data: Record<Kind, Row[]> }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("teachers");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "danger" } | null>(null);
  const cfg = CONFIG[kind];

  const rows = useMemo(() => {
    const n = normalizeQuery(q);
    return data[kind].filter((r) => !n || cfg.fields.some((f) => normalizeQuery(String(r[f.key] ?? "")).includes(n)));
  }, [data, kind, q, cfg.fields]);

  const flash = (text: string, tone: "ok" | "danger" = "ok") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3000);
  };

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash(data.error ?? "Помилка", "danger");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">Довідники</h1>
      <p className="mt-1 text-ink-3">Нові викладачі, дисципліни та аудиторії також створюються автоматично прямо в редакторі.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {(Object.keys(CONFIG) as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={clsx("rounded-lg px-3 py-1.5 text-sm font-semibold", kind === k ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}
            >
              {CONFIG[k].title} <span className="opacity-60">{data[k].length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Фільтр" className="bg-transparent text-sm outline-none" />
        </label>
        {msg && <span className={clsx("text-sm font-semibold", msg.tone === "ok" ? "text-ok" : "text-danger")}>{msg.text}</span>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-sm font-medium text-ink-2">
            <tr>
              {cfg.fields.map((f) => (
                <th key={f.key} className="px-3 py-2.5">{f.label}</th>
              ))}
              <th className="px-3 py-2.5">Занять</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <EditableRow key={`new-${kind}`} fields={cfg.fields} row={null} onSave={(v) => call(`/api/admin/dict/${kind}`, "POST", v).then((ok) => ok && flash("Додано"))} />
            {rows.map((r) => (
              <EditableRow
                key={`${kind}-${r.id}`}
                fields={cfg.fields}
                row={r}
                onSave={(v) => call(`/api/admin/dict/${kind}/${r.id}`, "PATCH", v).then((ok) => ok && flash("Збережено"))}
                onDelete={() => {
                  const n = r._count.lessons;
                  const warn =
                    n === 0
                      ? "Видалити запис?"
                      : kind === "groups"
                        ? `Разом із групою буде видалено ${n} занять. Продовжити?`
                        : `Запис використовується в ${n} заняттях — там він стане порожнім. Продовжити?`;
                  if (confirm(warn)) call(`/api/admin/dict/${kind}/${r.id}`, "DELETE").then((ok) => ok && flash("Видалено"));
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function EditableRow({
  fields,
  row,
  onSave,
  onDelete,
}: {
  fields: Field[];
  row: Row | null;
  onSave: (v: Record<string, unknown>) => Promise<unknown>;
  onDelete?: () => void;
}) {
  const initial = () => Object.fromEntries(fields.map((f) => [f.key, row?.[f.key] ?? (f.type === "bool" ? false : "")]));
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const dirty = fields.some((f) => values[f.key] !== (row?.[f.key] ?? (f.type === "bool" ? false : "")));
  const valid = fields.every((f) => !f.required || String(values[f.key] ?? "").trim());

  const submit = async () => {
    const payload = Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? Number(values[f.key]) : values[f.key]]));
    await onSave(payload);
    if (!row) setValues(initial());
  };

  return (
    <tr className={clsx(!row && "bg-brand-soft/40")}>
      {fields.map((f) => (
        <td key={f.key} className="px-2 py-1.5">
          {f.type === "bool" ? (
            <input type="checkbox" checked={!!values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          ) : (
            <input
              value={String(values[f.key] ?? "")}
              type={f.type === "number" ? "number" : "text"}
              placeholder={row ? "" : f.label}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && dirty && valid && submit()}
              className={clsx("h-9 rounded-lg border border-transparent bg-transparent px-2 outline-none hover:border-line focus:border-brand focus:bg-surface", f.width ?? "w-full")}
            />
          )}
        </td>
      ))}
      <td className="px-3 text-ink-3 tabular-nums">{row?._count.lessons ?? ""}</td>
      <td className="whitespace-nowrap px-2 text-right">
        {dirty && valid && (
          <button onClick={submit} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-ink">
            {row ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} {row ? "Зберегти" : "Додати"}
          </button>
        )}
        {row && onDelete && !dirty && (
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger"
            aria-label="Видалити"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
