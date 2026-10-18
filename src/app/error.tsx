"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Щось пішло не так</h1>
      <p className="mt-3 max-w-xl text-ink-2">Не вдалося завантажити розклад. Спробуйте ще раз за хвилину.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep">
          Спробувати ще раз
        </button>
        <Link href="/" className="rounded-md border border-line px-4 py-2 font-medium hover:border-brand hover:text-brand">
          На головну
        </Link>
      </div>
    </main>
  );
}
