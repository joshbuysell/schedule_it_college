"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { actionClass } from "./ui";

export default function CalendarMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const https = origin + path;
  const webcal = https.replace(/^https?:/, "webcal:");
  const item = "block px-3 py-2 text-sm hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className={actionClass} aria-expanded={open}>
        <CalendarPlus className="size-4" /> У календар
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border border-line bg-surface shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:w-auto max-sm:shadow-2xl">
          <p className="border-b border-line px-3 py-2 text-xs text-ink-3">Підписка оновлюється сама, включно із замінами.</p>
          <a className={item} href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
            Google Календар
          </a>
          <a className={item} href={webcal}>
            Apple Календар / Outlook
          </a>
          <button
            className={`${item} w-full text-left`}
            onClick={() => {
              navigator.clipboard.writeText(https);
              setOpen(false);
            }}
          >
            Скопіювати посилання на календар
          </button>
          <a className={`${item} border-t border-line text-ink-2`} href={`${path}?download`}>
            Завантажити файл .ics
          </a>
        </div>
      )}
    </div>
  );
}
