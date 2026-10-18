"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

export type PracticeDTO = { id: number; groupId: number; title: string; dates: string; teachers: string };

type Props = {
  groupId: number;
  practices: PracticeDTO[];
  onChange: (next: PracticeDTO[]) => void;
};

const input = "h-9 w-full rounded border border-transparent bg-transparent px-2 outline-none hover:border-line focus:border-brand focus:bg-surface";

export default function PracticeEditor({ groupId, practices, onChange }: Props) {
  const mine = practices.filter((p) => p.groupId === groupId);
  const [error, setError] = useState("");

  async function save(p: { id?: number; title: string; dates: string; teachers: string }) {
    setError("");
    const res = await fetch(p.id ? `/api/admin/practices/${p.id}` : "/api/admin/practices", {
      method: p.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, title: p.title, dates: p.dates, teachers: p.teachers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Не вдалося зберегти");
      return false;
    }
    const saved = data.practice as PracticeDTO;
    onChange(p.id ? practices.map((x) => (x.id === saved.id ? saved : x)) : [...practices, saved]);
    return true;
  }

  async function remove(id: number) {
    if (!confirm("Видалити запис про практику?")) return;
    const res = await fetch(`/api/admin/practices/${id}`, { method: "DELETE" });
    if (res.ok) onChange(practices.filter((x) => x.id !== id));
  }

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">Практика</h2>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2 text-left text-ink-3">
            <tr>
              <th className="w-40 px-3 py-2 font-medium">Дати</th>
              <th className="px-3 py-2 font-medium">Назва</th>
              <th className="px-3 py-2 font-medium">Керівники</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {mine.map((p) => (
              <Row key={p.id} value={p} onSave={save} onDelete={() => remove(p.id)} />
            ))}
            <Row key={`new-${groupId}-${mine.length}`} value={null} onSave={save} />
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}

function Row({
  value,
  onSave,
  onDelete,
}: {
  value: PracticeDTO | null;
  onSave: (p: { id?: number; title: string; dates: string; teachers: string }) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const [v, setV] = useState({ dates: value?.dates ?? "", title: value?.title ?? "", teachers: value?.teachers ?? "" });
  const dirty = !value || v.dates !== value.dates || v.title !== value.title || v.teachers !== value.teachers;
  const valid = v.dates.trim().length >= 3 && v.title.trim().length >= 2;

  const submit = async () => {
    const ok = await onSave({ ...v, id: value?.id });
    if (ok && !value) setV({ dates: "", title: "", teachers: "" });
  };

  return (
    <tr className={value ? "" : "bg-brand-soft/40"}>
      {(["dates", "title", "teachers"] as const).map((k) => (
        <td key={k} className="px-1 py-1">
          <input
            value={v[k]}
            placeholder={value ? "" : k === "dates" ? "25.05–07.06" : k === "title" ? "Навчальна практика" : "Прізвище І.Б."}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && dirty && valid && submit()}
            className={input}
          />
        </td>
      ))}
      <td className="whitespace-nowrap px-2 text-right">
        {dirty && valid ? (
          <button onClick={submit} className="inline-flex items-center gap-1 rounded bg-brand px-2.5 py-1.5 text-xs font-medium text-white">
            {value ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} {value ? "Зберегти" : "Додати"}
          </button>
        ) : (
          onDelete && (
            <button onClick={onDelete} className="rounded p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Видалити">
              <Trash2 className="size-4" />
            </button>
          )
        )}
      </td>
    </tr>
  );
}
