"use client";

import { useEffect, useRef } from "react";

export default function EmbedPreview() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const s = document.createElement("script");
    s.src = "/embed.js";
    s.async = true;
    host.after(s);
    return () => s.remove();
  }, []);
  return <div ref={ref} id="itc-schedule" />;
}
