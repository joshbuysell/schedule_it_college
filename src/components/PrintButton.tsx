"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold hover:border-ink-3"
    >
      <Printer className="size-4" /> Друк
    </button>
  );
}
