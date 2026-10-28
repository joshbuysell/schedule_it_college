"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { MY_GROUP_KEY } from "./MyGroup";

const KEY = "schedule:onboarded";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function GettingStarted() {
  const [show, setShow] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY) && !localStorage.getItem(MY_GROUP_KEY));
    } catch {}
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <section className="relative mt-8 rounded-md border border-brand/25 bg-brand-soft p-5" aria-label="Як почати">
      <button onClick={dismiss} className="absolute right-2 top-2 rounded p-1.5 text-ink-3 hover:bg-white hover:text-ink" aria-label="Закрити підказку">
        <X className="size-4" />
      </button>
      <h2 className="pr-8 text-lg font-semibold">Вперше тут? Три кроки — і розклад завжди під рукою</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ["Знайдіть групу", "Введіть назву в пошуку вище, напр. «КІ-21»."],
          ["Зробіть її своєю", "Кнопка «Зробити моєю групою» — і пари на сьогодні будуть тут."],
          ["Увімкніть сповіщення", "Кнопка «Сповіщення» — і про заміни ви дізнаєтесь першими."],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{i + 1}</span>
            <span>
              <b className="block">{title}</b>
              <span className="text-sm text-ink-2">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        {install && (
          <button
            onClick={() => install.prompt().then(() => setInstall(null))}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-deep"
          >
            <Download className="size-4" /> Встановити як застосунок
          </button>
        )}
        <Link href="/help" className="font-medium text-brand hover:underline">
          Детальніше в довідці →
        </Link>
        <button onClick={dismiss} className="ml-auto text-ink-2 hover:text-ink">
          Зрозуміло, більше не показувати
        </button>
      </div>
    </section>
  );
}
