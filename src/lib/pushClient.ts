export const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev";

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function pushSupport(): PushState {
  if (typeof window === "undefined") return "loading";
  const ios = isIOS();
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

export type PushReady = { reg: ServiceWorkerRegistration; key: Uint8Array<ArrayBuffer> };

export async function preparePush(): Promise<PushReady> {
  const [reg, { publicKey }] = await Promise.all([registration(), fetch("/api/v1/push").then((r) => r.json())]);
  return { reg, key: keyBytes(publicKey) };
}

// Safari на iPhone дозволяє підписатися лише прямо з обробника натискання, тому реєстрацію й ключ готуємо заздалегідь.
export async function subscribe({ reg, key }: PushReady) {
  const opts = { userVisibleOnly: true, applicationServerKey: key };
  try {
    return await reg.pushManager.subscribe(opts);
  } catch (e) {
    const old = await reg.pushManager.getSubscription();
    if (!old) throw e;
    await old.unsubscribe();
    return reg.pushManager.subscribe(opts);
  }
}

export function pushErrorText(e: unknown) {
  if (Notification.permission === "granted") return "Телефон не зміг підписатися на сповіщення. Спробуйте пізніше, а поки підпишіться на розклад через «У календар».";
  if (e instanceof DOMException && e.name === "NotAllowedError") return "Дозвіл на сповіщення не надано. Натисніть «Увімкнути» ще раз і виберіть «Дозволити».";
  if (e instanceof Error && /[а-яіїєґ]/i.test(e.message)) return e.message;
  return "Не вдалося увімкнути сповіщення. Перевірте інтернет і спробуйте ще раз.";
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export async function api(method: "POST" | "DELETE", path: string, body: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Не вдалося зберегти");
  return res.json();
}
