"use client";

import { useEffect } from "react";
import { SW_URL } from "@/lib/pushClient";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(SW_URL).catch(() => {});
  }, []);
  return null;
}
