"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Track() {
  const path = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || navigator.webdriver || /^\/(admin|cabinet|login|poster)/.test(path)) return;
    navigator.sendBeacon?.("/api/v1/hit", path);
  }, [path]);
  return null;
}
