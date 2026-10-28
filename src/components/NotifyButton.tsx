"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import clsx from "clsx";
import { api, currentSubscription, pushSupport, subscribe, type PushState } from "@/lib/pushClient";

type Props = { target: string; group?: string; teacherId?: number; name: string };

export default function NotifyButton({ target, group, teacherId, name }: Props) {
  const [state, setState] = useState<PushState>("loading");
  const [morning, setMorning] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [embedded, setEmbedded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmbedded(window.top !== window.self);
    if (new URLSearchParams(location.search).has("notify")) setOpen(true);
    const support = pushSupport();
    if (support !== "off") return setState(support);
    currentSubscription()
      .then(async (sub) => {
        if (!sub) return setState("off");
        const { targets } = await api("POST", "/api/v1/push/status", { endpoint: sub.endpoint });
        const mine = (targets as { target: string; morning: boolean }[]).find((t) => t.target === target);
        if (mine) setMorning(mine.morning);
        setState(mine ? "on" : "off");
      })
      .catch(() => setState("off"));
  }, [target]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function save(nextMorning = morning) {
    setBusy(true);
    setError("");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const sub = await subscribe();
      await api("POST", "/api/v1/push", { subscription: sub.toJSON(), group, teacherId, morning: nextMorning });
      setMorning(nextMorning);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося увімкнути сповіщення");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) await api("DELETE", "/api/v1/push", { endpoint: sub.endpoint, target });
      setState("off");
    } catch {
      setError("Не вдалося вимкнути");
    } finally {
      setBusy(false);
    }
  }

  if (embedded) {
    const page = group ? `/group/${encodeURIComponent(group)}` : `/teacher/${teacherId}`;
    return (
      <a href={`${page}?notify`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <Bell className="size-4" /> Сповіщення про заміни
      </a>
    );
  }

  const on = state === "on";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={clsx(
          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
          on ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-2 hover:border-brand hover:text-brand",
        )}
      >
        {on ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {on ? "Сповіщення увімкнено" : "Сповіщення"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border border-line bg-surface p-4 text-sm shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:w-auto max-sm:shadow-2xl">
          {state === "ios-install" ? (
            <>
              <p className="font-medium">На iPhone сповіщення працюють із головного екрана</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
                <li>
                  Натисніть «Поділитися» <span aria-hidden>⎋</span> у Safari.
                </li>
                <li>Виберіть «На початковий екран».</li>
                <li>Відкрийте розклад зі значка й натисніть «Сповіщення».</li>
              </ol>
              <p className="mt-2 text-ink-3">Потрібна iOS 16.4 або новіша.</p>
            </>
          ) : state === "unsupported" ? (
            <p className="text-ink-2">Цей браузер не підтримує сповіщення. Підпишіться на розклад через «У календар»: заміни теж зʼявлятимуться там.</p>
          ) : state === "denied" ? (
            <p className="text-ink-2">
              Сповіщення для цього сайту заблоковано в браузері. Дозвольте їх у налаштуваннях сайту (значок ліворуч від адреси) й оновіть сторінку.
            </p>
          ) : (
            <>
              <p className="font-medium">{on ? `Ви отримуєте сповіщення: ${name}` : `Сповіщення про заміни: ${name}`}</p>
              <p className="mt-1 text-ink-2">
                Коли навчальна частина змінить пару, на телефон чи компʼютер прийде повідомлення
                {teacherId ? ", а також відповідь на ваші заявки." : "."}
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--brand)]"
                  checked={morning}
                  disabled={busy}
                  onChange={(e) => (on ? save(e.target.checked) : setMorning(e.target.checked))}
                />
                <span>Щоранку перед парами — розклад на день</span>
              </label>
              {error && <p className="mt-2 text-danger">{error}</p>}
              <div className="mt-4 flex gap-2">
                {on ? (
                  <button onClick={disable} disabled={busy} className="rounded-md border border-line px-3 py-1.5 font-medium text-ink-2 hover:border-danger hover:text-danger">
                    Вимкнути
                  </button>
                ) : (
                  <button
                    onClick={() => save()}
                    disabled={busy || state === "loading"}
                    className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-deep disabled:opacity-60"
                  >
                    {busy ? "Вмикаю…" : "Увімкнути"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
