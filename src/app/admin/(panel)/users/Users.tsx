"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Printer, Trash2, UserPlus } from "lucide-react";

type User = { id: number; email: string; name: string; role: string; teacherId: number | null };
type Teacher = { id: number; shortName: string; fullName: string | null };
type Credential = { teacher: string; login: string; password: string };

const ROLE_LABEL: Record<string, string> = { admin: "Адміністратор", editor: "Навчальна частина", teacher: "Викладач" };

export default function Users({ users, teachers, me, canManage }: { users: User[]; teachers: Teacher[]; me: number; canManage: boolean }) {
  const router = useRouter();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", name: "", role: "editor", teacherId: "" });
  const [filter, setFilter] = useState("");
  const free = teachers.filter((t) => !users.some((u) => u.teacherId === t.id));
  const teacherName = (id: number | null) => teachers.find((t) => t.id === id)?.shortName;

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

  async function createAllTeachers() {
    if (!confirm(`Створити облікові записи для ${free.length} викладачів?`)) return;
    const data = await call("/api/admin/users/teachers", "POST");
    if (data) setCreds(data.created);
  }

  async function createOne(e: React.FormEvent) {
    e.preventDefault();
    const t = teachers.find((x) => x.id === +form.teacherId);
    const data = await call("/api/admin/users", "POST", {
      email: form.email,
      name: form.name || t?.fullName || t?.shortName || form.email,
      role: form.role,
      teacherId: form.teacherId ? +form.teacherId : null,
    });
    if (data) {
      setCreds([{ teacher: data.user.name, login: data.user.email, password: data.password }]);
      setForm({ email: "", name: "", role: "editor", teacherId: "" });
    }
  }

  async function reset(u: User) {
    if (!confirm(`Згенерувати новий пароль для «${u.name}»?`)) return;
    const data = await call(`/api/admin/users/${u.id}`, "PATCH", { resetPassword: true });
    if (data) setCreds([{ teacher: u.name, login: u.email, password: data.password }]);
  }

  const shown = users.filter((u) => !filter || (u.name + u.email).toLowerCase().includes(filter.toLowerCase()));
  const input = "h-9 rounded-md border border-line bg-surface px-2 outline-none focus:border-brand";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Користувачі</h1>
          <p className="mt-1 text-ink-2">Навчальна частина редагує розклад, викладачі подають заявки на зміни через свій кабінет.</p>
        </div>
        {canManage && free.length > 0 && (
          <button onClick={createAllTeachers} className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep">
            <UserPlus className="size-4" /> Створити доступи для всіх викладачів ({free.length})
          </button>
        )}
      </div>

      {!canManage && <p className="mt-4 rounded-md bg-surface px-3 py-2 text-ink-2">Керувати користувачами може лише адміністратор.</p>}
      {error && <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {creds.length > 0 && (
        <section className="print-area mt-6 rounded-md border border-brand bg-surface p-4">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Збережіть або роздрукуйте ці дані: пароль показується лише один раз.</p>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:border-brand">
              <Printer className="size-4" /> Друк
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-ink-3">
              <tr>
                <th className="py-1 font-medium">Користувач</th>
                <th className="py-1 font-medium">Логін</th>
                <th className="py-1 font-medium">Пароль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {creds.map((c) => (
                <tr key={c.login}>
                  <td className="py-1.5">{c.teacher}</td>
                  <td className="py-1.5 font-mono">{c.login}</td>
                  <td className="py-1.5 font-mono">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-3">Вхід на сайті розкладу: сторінка /login. Пароль можна змінити, звернувшись до адміністратора.</p>
        </section>
      )}

      {canManage && (
        <form onSubmit={createOne} className="no-print mt-6 flex flex-wrap items-end gap-2 rounded-md border border-line bg-surface p-3">
          <label className="text-sm text-ink-2">
            Логін або email
            <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${input} mt-1 block w-48`} />
          </label>
          <label className="text-sm text-ink-2">
            Імʼя
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${input} mt-1 block w-56`} />
          </label>
          <label className="text-sm text-ink-2">
            Роль
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${input} mt-1 block`}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {form.role === "teacher" && (
            <label className="text-sm text-ink-2">
              Викладач у розкладі
              <select required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={`${input} mt-1 block w-52`}>
                <option value="">—</option>
                {free.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="h-9 rounded-md bg-brand px-4 font-medium text-white hover:bg-brand-deep">Додати</button>
        </form>
      )}

      <div className="no-print mt-6">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Пошук" className={`${input} mb-2 w-64`} />
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-ink-3">
              <tr>
                <th className="px-3 py-2 font-medium">Імʼя</th>
                <th className="px-3 py-2 font-medium">Логін</th>
                <th className="px-3 py-2 font-medium">Роль</th>
                <th className="px-3 py-2 font-medium">У розкладі</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2">
                    {canManage && u.id !== me ? (
                      <select value={u.role} onChange={(e) => call(`/api/admin/users/${u.id}`, "PATCH", { role: e.target.value })} className="rounded border border-line bg-surface px-1 py-0.5">
                        {Object.entries(ROLE_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABEL[u.role] ?? u.role
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-2">{teacherName(u.teacherId) ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {canManage && u.id !== me && (
                      <>
                        <button onClick={() => reset(u)} className="rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-brand" title="Новий пароль">
                          <KeyRound className="size-4" />
                        </button>
                        <button
                          onClick={() => confirm(`Видалити «${u.name}»?`) && call(`/api/admin/users/${u.id}`, "DELETE")}
                          className="rounded p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger"
                          title="Видалити"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
