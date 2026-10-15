"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyCode({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#14161f] text-[#e8eaf2]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-semibold text-white/60">
        <span>{label ?? "HTML"}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-white hover:bg-white/20"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Скопійовано" : "Копіювати"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}
