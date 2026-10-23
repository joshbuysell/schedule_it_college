"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    if (res.ok) {
      const { role } = await res.json();
      router.replace(role === "teacher" ? (next.startsWith("/cabinet") ? next : "/cabinet") : next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Помилка входу");
      setBusy(false);
    }
  }

  const input = "mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">
        Логін або email
        <input name="email" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Пароль
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
      <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-brand-ink hover:opacity-90 disabled:opacity-60">
        {busy && <LoaderCircle className="size-4 animate-spin" />} Увійти
      </button>
    </form>
  );
}
