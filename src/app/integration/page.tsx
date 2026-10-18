import type { Metadata } from "next";
import { headers } from "next/headers";
import { Download } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CopyCode from "@/components/CopyCode";
import EmbedPreview from "@/components/EmbedPreview";

export const metadata: Metadata = { title: "Вбудовування на сайт коледжу" };
export const dynamic = "force-dynamic";

async function publicUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function IntegrationPage() {
  const base = await publicUrl();
  const snippet = `<div id="itc-schedule"></div>\n<script src="${base}/embed.js" async></script>`;
  const groupSnippet = `<div id="itc-schedule" data-group="КІ-21"></div>\n<script src="${base}/embed.js" async></script>`;
  const fallback = `<iframe src="${base}/embed" title="Розклад занять" width="100%" height="1100" style="border:0"></iframe>`;

  const step = (n: number, title: string, body: React.ReactNode) => (
    <li className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-medium text-white">{n}</span>
      <div className="pt-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-ink-2">{body}</div>
      </div>
    </li>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Розклад на сайті коледжу</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Замість PDF зі сканом на сторінці «Розклад» буде живий розклад: пошук групи, сітка занять, чисельник/знаменник.
          Зміни, внесені навчальною частиною, зʼявляються на сайті одразу. Віджет сам підлаштовує висоту, а вибрана група
          записується в адресу сторінки (<code>#schedule=g:КІ-21</code>), тож посиланням можна ділитися.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Як вставити</h2>
          <ol className="mt-5 space-y-5">
            {step(1, "Відкрийте сторінку «Розклад» у WordPress", <>Записи → «РОЗКЛАД навчальних занять…» → Редагувати.</>)}
            {step(2, "Видаліть блок із PDF", <>Блок PDF Embedder із файлом розкладу більше не потрібен.</>)}
            {step(
              3,
              "Додайте блок «Власний HTML» і вставте код",
              <div className="mt-2 space-y-2">
                <CopyCode code={snippet} />
                <p className="text-sm text-ink-3">Збережіть сторінку — готово. Студенти бачитимуть вибір групи й розклад.</p>
              </div>,
            )}
          </ol>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Розклад однієї групи (напр. на сторінці спеціальності)</h3>
            <div className="mt-2">
              <CopyCode code={groupSnippet} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Якщо WordPress не дозволяє скрипти</h3>
            <p className="mt-1 text-sm text-ink-3">Простий iframe без автоматичної висоти:</p>
            <div className="mt-2">
              <CopyCode code={fallback} />
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-xl font-semibold">Плагін для WordPress</h2>
          <p className="mt-1 text-ink-2">
            Якщо є доступ адміністратора — встановіть плагін «Розклад ІТ коледжу». Він додає шорткод{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">[itcollege_schedule]</code> (або{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">[itcollege_schedule group=&quot;КІ-21&quot;]</code>) і сторінку
            налаштувань з адресою системи розкладу.
          </p>
          <a
            href="/downloads/itcollege-schedule.zip"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep"
          >
            <Download className="size-4" /> Завантажити плагін (.zip)
          </a>
          <p className="mt-2 text-sm text-ink-3">Плагіни → Додати новий → Завантажити плагін → вибрати файл → Активувати.</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Попередній перегляд</h2>
          
          <div className="mt-4 rounded-md border border-line p-4 sm:p-6">
            <EmbedPreview />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
