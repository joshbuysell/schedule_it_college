export const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev";

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function pushSupport(): PushState {
  if (typeof window === "undefined") return "loading";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return ios && !standalone ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "off";
}

export async function registration() {
  await navigator.serviceWorker.register(SW_URL);
  return navigator.serviceWorker.ready;
}

function keyBytes(base64: string) {
  const s = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

export async function subscribe() {
  const reg = await registration();
  const { publicKey } = await fetch("/api/v1/push").then((r) => r.json());
  const opts = { userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) };
  try {
    return await reg.pushManager.subscribe(opts);
  } catch {
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    return reg.pushManager.subscribe(opts);
  }
}

export async function api(method: "POST" | "DELETE", path: string, body: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Не вдалося зберегти");
  return res.json();
}
