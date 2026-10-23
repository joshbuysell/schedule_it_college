"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";

type Preview = { total: number; valid: number; groups: string[]; unknownGroups: string[]; errors: { row: number; message: string }[]; errorCount: number };

export default function ImportPanel({ semesters }: { semesters: { id: number; title: string; active: boolean }[] }) {
  const router = useRouter();
  const drafts = semesters.filter((s) => !s.active);
  const [semesterId, setSemesterId] = useState(String((drafts[0] ?? semesters[0])?.id ?? ""));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function send(apply: boolean) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("semesterId", semesterId);
    fd.set("apply", apply ? "1" : "0");
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ text: data.error ?? "Помилка імпорту", ok: false });
      return;
    }
    if (apply) {
      setMsg({ text: `Імпортовано ${data.imported} занять для ${data.groups.length} груп.`, ok: true });
      setPreview(null);
      setFile(null);
      router.refresh();
    } else setPreview(data.preview);
  }

  const target = semesters.find((s) => String(s.id) === semesterId);

  return (
    <section className="mt-8 rounded-md border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">Імпорт розкладу з Excel</h2>
      <p className="mt-1 text-sm text-ink-2">
        Заповніть{" "}
        <a href="/api/admin/export/template" className="text-brand hover:underline">
          шаблон
        </a>{" "}
        (або поточний розклад, вивантажений у Excel) і завантажте файл. Заняття груп із файлу у вибраному семестрі будуть замінені.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink-2">
          У семестр
          <select value={semesterId} onChange={(e) => { setSemesterId(e.target.value); setPreview(null); }} className="mt-1 block h-9 rounded-md border border-line bg-surface px-2">
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} {s.active ? "(опубліковано)" : "(чернетка)"}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-dashed border-ink-3/50 px-3 text-sm hover:border-brand">
          <Upload className="size-4" />
          {file ? file.name : "Вибрати файл .xlsx"}
          <input type="file" accept=".xlsx" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
        </label>
        <button disabled={!file || busy} onClick={() => send(false)} className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : "Перевірити"}
        </button>
      </div>

      {target?.active && <p className="mt-3 text-sm text-warn">Увага: це опублікований семестр — студенти одразу побачать зміни. Безпечніше імпортувати в чернетку.</p>}
      {msg && <p className={`mt-3 rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger"}`}>{msg.text}</p>}

      {preview && (
        <div className="mt-4 rounded-md bg-surface-2 p-4 text-sm">
          <p>
            Рядків: <b>{preview.total}</b>, придатних: <b>{preview.valid}</b>, груп: <b>{preview.groups.length}</b> ({preview.groups.join(", ")})
          </p>
          {preview.unknownGroups.length > 0 && <p className="mt-2 text-danger">Невідомі групи (додайте в довідник): {preview.unknownGroups.join(", ")}</p>}
          {preview.errorCount > 0 && (
            <ul className="mt-2 space-y-0.5 text-danger">
              {preview.errors.map((e) => (
                <li key={e.row}>
                  Рядок {e.row}: {e.message}
                </li>
              ))}
              {preview.errorCount > preview.errors.length && <li>… і ще {preview.errorCount - preview.errors.length}</li>}
            </ul>
          )}
          {preview.errorCount === 0 && preview.unknownGroups.length === 0 && preview.valid > 0 && (
            <button disabled={busy} onClick={() => send(true)} className="mt-3 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep">
              Імпортувати {preview.valid} занять
            </button>
          )}
        </div>
      )}
    </section>
  );
}
