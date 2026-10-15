import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import PrintButton from "./PrintButton";

/** Обгортка сторінок розкладу (група / викладач / аудиторія). */
export default function ScheduleShell({
  eyebrow,
  title,
  subtitle,
  actions,
  stats,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: { label: string; value: string | number }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <Link href="/" className="no-print mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-3 hover:text-ink">
          <ChevronLeft className="size-4" /> Усі розклади
        </Link>
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            {subtitle && <div className="mt-2 text-ink-2">{subtitle}</div>}
            {stats && (
              <dl className="mt-4 flex flex-wrap gap-2">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <span className="font-bold">{s.value}</span> <span className="text-ink-3">{s.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {actions}
            <PrintButton />
          </div>
        </div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
