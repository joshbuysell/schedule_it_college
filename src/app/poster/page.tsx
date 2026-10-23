import Image from "next/image";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { publicUrl } from "@/lib/publicUrl";
import { byName } from "@/lib/schedule";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "QR-плакат", robots: { index: false } };
export const dynamic = "force-dynamic";

async function qr(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1c1f3d", light: "#ffffff" } });
}

function Sheet({ title, subtitle, url, svg, compact }: { title: string; subtitle: string; url: string; svg: string; compact?: boolean }) {
  return (
    <section className={compact ? "poster-half" : "poster-page"}>
      <div className="flex items-center gap-3">
        <Image src="/logo-lit.jpg" alt="" width={56} height={56} className="rounded-full" />
        <p className="text-sm leading-tight text-ink-2">
          Фаховий коледж інформаційних технологій
          <br />
          НУ «Львівська політехніка»
        </p>
      </div>
      <h1 className={compact ? "mt-4 text-3xl font-semibold" : "mt-10 text-5xl font-semibold leading-tight"}>{title}</h1>
      <p className={compact ? "mt-1 text-lg text-ink-2" : "mt-3 text-2xl text-ink-2"}>{subtitle}</p>
      <div className={compact ? "mt-5 w-48" : "mx-auto mt-12 w-96"} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className={compact ? "mt-4 font-mono text-sm" : "mt-10 text-center font-mono text-lg"}>{decodeURI(url).replace(/^https?:\/\//, "")}</p>
      {!compact && (
        <ul className="mx-auto mt-10 max-w-xl space-y-2 text-lg text-ink-2">
          <li>Наведіть камеру телефона на QR-код.</li>
          <li>Знайдіть свою групу й натисніть «Зробити моєю групою».</li>
          <li>Заміни та перенесення пар зʼявляються одразу.</li>
        </ul>
      )}
    </section>
  );
}

export default async function PosterPage({ searchParams }: { searchParams: Promise<{ group?: string; all?: string }> }) {
  const { group, all } = await searchParams;
  const base = await publicUrl();

  if (all !== undefined) {
    const groups = (await prisma.group.findMany({ select: { name: true, specialty: true, course: true } })).sort((a, b) => byName(a.name, b.name));
    const sheets = await Promise.all(
      groups.map(async (g) => {
        const url = `${base}/group/${encodeURIComponent(g.name)}`;
        return { g, url, svg: await qr(url) };
      }),
    );
    return (
      <main className="poster-root">
        <Toolbar />
        {sheets.map(({ g, url, svg }) => (
          <Sheet key={g.name} compact title={`Розклад ${g.name}`} subtitle={`${g.course} курс · ${g.specialty}`} url={url} svg={svg} />
        ))}
      </main>
    );
  }

  const url = group ? `${base}/group/${encodeURIComponent(group)}` : base;
  return (
    <main className="poster-root">
      <Toolbar />
      <Sheet title={group ? `Розклад групи ${group}` : "Розклад занять у телефоні"} subtitle={group ? "Завжди актуальний, із замінами" : "Усі групи, викладачі та заміни"} url={url} svg={await qr(url)} />
    </main>
  );
}

function Toolbar() {
  return (
    <div className="no-print mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-3 rounded-md border border-line bg-surface p-3 text-sm">
      <span className="text-ink-2">Друкуйте на А4. Для всіх груп — по два плакати на аркуш.</span>
      <PrintButton />
    </div>
  );
}
