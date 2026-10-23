"use client";

import { useEffect, useState } from "react";

type Status = { enabled: boolean; subs: number; webhook: string | null; username: string | null };

export default function TelegramPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = () => fetch("/api/admin/telegram").then((r) => r.json()).then(setStatus);
  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setMsg(null);
    const res = await fetch("/api/admin/telegram", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { text: "Бота підключено.", ok: true } : { text: data.error ?? "Помилка", ok: false });
    load();
  }

  return (
    <section className="mx-auto mt-6 max-w-3xl px-4">
      <div className="rounded-md border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Telegram-бот</h2>
        {!status ? (
          <p className="mt-2 text-sm text-ink-3">Завантаження…</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-2">
              {status.enabled ? (
                <>
                  Бот {status.username ? <a className="text-brand hover:underline" href={`https://t.me/${status.username}`} target="_blank" rel="noreferrer">@{status.username}</a> : "налаштований"}
                  {" · "}
                  {status.webhook ? "підключено" : "ще не підключено до сайту"} · підписників: <b>{status.subs}</b>
                </>
              ) : (
                "Бот не налаштований."
              )}
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-2">
              <li>
                У Telegram відкрийте @BotFather → <code>/newbot</code>, придумайте назву (напр. «Розклад ІТ коледжу») і отримайте токен.
              </li>
              <li>
                Додайте у змінні середовища сервера <code>TELEGRAM_BOT_TOKEN</code> (токен) і <code>TELEGRAM_WEBHOOK_SECRET</code> (будь-який випадковий
                рядок), перезапустіть сайт.
              </li>
              <li>Натисніть «Підключити» — бот почне відповідати студентам і розсилати заміни.</li>
            </ol>
            <button
              disabled={!status.enabled}
              onClick={connect}
              className="mt-4 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep disabled:opacity-50"
            >
              Підключити
            </button>
            {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
          </>
        )}
      </div>
    </section>
  );
}
